#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import crypto from 'crypto';
import { extractPdfText } from './lib/pdf_text.mjs';

const ROOT = '/docker/openspg';
const SOURCE_ROOT = path.join(ROOT, 'downloads/partner/optima_technical');
const DOWNLOAD_MANIFEST_PATH = path.join(SOURCE_ROOT, 'download_manifest.json');
const EXTRACT_ROOT = path.join(SOURCE_ROOT, 'extracted', 'zip_text');
const MANIFEST_PATH = path.join(SOURCE_ROOT, 'extraction_manifest.json');

const ARCHIVE_IDS = new Set(
  String(process.env.PARTNER_EXTRACT_ARCHIVE_IDS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const TEXT_EXTENSIONS = new Set(
  String(
    process.env.PARTNER_EXTRACT_EXTENSIONS ||
      'txt,md,csv,xml,js,xpt,hta,htm,html,cs,sql,json,ini,config,xsd,xsl,bat,cmd,vbs,vb,h,tlh,tli,pdf',
  )
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const NESTED_TEXT_EXTENSIONS = new Set(
  String(
    process.env.PARTNER_EXTRACT_NESTED_EXTENSIONS ||
      'txt,md,csv,xml,js,xpt,hta,htm,html,cs,sql,json,pdf',
  )
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean),
);
const LIMIT = Math.max(1, Number(process.env.PARTNER_EXTRACT_LIMIT || '10'));
const MAX_FILES_PER_ARCHIVE = Math.max(1, Number(process.env.PARTNER_EXTRACT_MAX_FILES_PER_ARCHIVE || '120'));
const MAX_BYTES_PER_FILE = Math.max(1, Number(process.env.PARTNER_EXTRACT_MAX_BYTES_PER_FILE || '1048576'));
const FORCE = /^(1|true|yes)$/i.test(String(process.env.PARTNER_EXTRACT_FORCE || ''));

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function normalizeWhitespace(value) {
  return String(value || '')
    .split('\u0000').join(' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function sanitizeSegment(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/[\s/\\:]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140) || 'item';
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function extensionOf(entryPath) {
  const ext = path.extname(String(entryPath || '')).toLowerCase().replace(/^\./, '');
  return ext;
}

function decodeBuffer(buffer) {
  const utf8 = buffer.toString('utf8');
  const replacementCount = (utf8.match(/\uFFFD/g) || []).length;
  if (replacementCount <= Math.max(2, Math.floor(utf8.length * 0.01))) {
    return utf8;
  }
  return buffer.toString('latin1');
}

function looksHumanText(value) {
  const text = normalizeWhitespace(value);
  if (!text || text.length < 12) return false;
  const chars = [...text];
  let printable = 0;
  let alnum = 0;
  for (const ch of chars) {
    if (/[\p{L}\p{N}]/u.test(ch)) {
      printable += 1;
      alnum += 1;
      continue;
    }
    if (/[\s.,:;!?()[\]{}'"%&@/\\+\-=_*#<>|]/u.test(ch)) {
      printable += 1;
    }
  }
  const printableRatio = printable / Math.max(chars.length, 1);
  if (printableRatio < 0.7) return false;
  if (alnum < 6) return false;
  return true;
}

function listZipEntries(zipPath) {
  const output = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((entry) => !entry.endsWith('/'));
}

function selectEntries(entries) {
  return entries
    .filter((entry) => {
      const ext = extensionOf(entry);
      return TEXT_EXTENSIONS.has(ext) || ext === 'zip';
    })
    .sort((left, right) => {
      const score = (ext) => {
        switch (ext) {
          case 'zip': return 99;
          case 'js': return 100;
          case 'csv': return 98;
          case 'xml': return 96;
          case 'xpt': return 95;
          case 'hta': return 94;
          case 'htm': return 93;
          case 'html': return 92;
          case 'cs': return 93;
          case 'txt': return 91;
          case 'md': return 90;
          case 'sql': return 89;
          case 'json': return 88;
          case 'ini': return 82;
          case 'config': return 80;
          case 'xsd': return 78;
          case 'xsl': return 77;
          case 'vbs': return 76;
          case 'vb': return 75;
          case 'bat': return 74;
          case 'cmd': return 73;
          case 'h': return 40;
          case 'tlh': return 30;
          case 'tli': return 20;
          default: return 10;
        }
      };
      const scoreDelta = score(extensionOf(right)) - score(extensionOf(left));
      if (scoreDelta !== 0) return scoreDelta;
      return left.localeCompare(right);
    })
    .slice(0, MAX_FILES_PER_ARCHIVE);
}

function selectNestedEntries(entries) {
  return entries
    .filter((entry) => NESTED_TEXT_EXTENSIONS.has(extensionOf(entry)))
    .sort((left, right) => left.localeCompare(right))
    .slice(0, MAX_FILES_PER_ARCHIVE);
}

function extractEntryBuffer(zipPath, entryName) {
  return execFileSync('unzip', ['-p', zipPath, entryName], {
    encoding: 'buffer',
    maxBuffer: Math.max(MAX_BYTES_PER_FILE * 2, 4 * 1024 * 1024),
  });
}

function listZipEntriesFromFile(zipPath) {
  const output = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((entry) => !entry.endsWith('/'));
}

function relativeZipTextPath(assetId, entryName, ordinal) {
  const ext = extensionOf(entryName) || 'txt';
  const fileName = `${String(ordinal).padStart(3, '0')}__${sanitizeSegment(entryName)}.${ext}.txt`;
  return path.join('extracted', 'zip_text', assetId, fileName).replaceAll(path.sep, '/');
}

function relativeTempPdfPath(assetId, entryName, ordinal) {
  const fileName = `${String(ordinal).padStart(3, '0')}__${sanitizeSegment(entryName)}`;
  return path.join('extracted', 'tmp_pdf', assetId, fileName).replaceAll(path.sep, '/');
}

function relativeTempZipPath(assetId, entryName, ordinal) {
  const fileName = `${String(ordinal).padStart(3, '0')}__${sanitizeSegment(entryName)}`;
  return path.join('extracted', 'tmp_zip', assetId, fileName).replaceAll(path.sep, '/');
}

function selectedAssets(downloadManifest) {
  const latestById = new Map();
  for (const run of downloadManifest.runs || []) {
    for (const asset of run.assets || []) {
      if (!asset?.id || !asset?.localPath) continue;
      if (!asset.localPath.endsWith('.zip')) continue;
      if (ARCHIVE_IDS.size && !ARCHIVE_IDS.has(asset.id)) continue;
      const existing = latestById.get(asset.id);
      if (!existing) latestById.set(asset.id, asset);
    }
  }

  return [...latestById.values()]
    .filter((asset) => fs.existsSync(path.join(SOURCE_ROOT, asset.localPath)))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .slice(0, LIMIT);
}

function refreshReadme(lastRun) {
  const readmePath = path.join(SOURCE_ROOT, 'README.md');
  if (!fs.existsSync(readmePath)) return;
  const text = fs.readFileSync(readmePath, 'utf8');
  const marker = 'Last known extraction run:';
  const section = [
    marker,
    `- archives selected: \`${lastRun.selectedArchiveCount}\``,
    `- archives processed: \`${lastRun.processedArchiveCount}\``,
    `- text files extracted: \`${lastRun.extractedFileCount}\``,
    `- skipped existing: \`${lastRun.skippedExistingCount}\``,
    `- skipped non-text: \`${lastRun.skippedNonTextCount}\``,
    `- errors: \`${lastRun.errorCount}\``,
    '',
  ].join('\n');

  let next;
  if (text.includes(marker)) {
    next = text.replace(new RegExp(`${marker}[\\s\\S]*?$`), section.trimEnd());
  } else {
    next = `${text.trimEnd()}\n\n${section}`;
  }
  fs.writeFileSync(readmePath, `${next.trimEnd()}\n`, 'utf8');
}

async function main() {
  if (!fs.existsSync(DOWNLOAD_MANIFEST_PATH)) {
    throw new Error(`Missing download manifest: ${DOWNLOAD_MANIFEST_PATH}`);
  }

  ensureDir(EXTRACT_ROOT);

  const downloadManifest = readJson(DOWNLOAD_MANIFEST_PATH);
  const archives = selectedAssets(downloadManifest);
  const previousManifest = fs.existsSync(MANIFEST_PATH) ? readJson(MANIFEST_PATH) : { runs: [] };

  const run = {
    generatedAt: new Date().toISOString(),
    config: {
      archiveIds: [...ARCHIVE_IDS],
      textExtensions: [...TEXT_EXTENSIONS],
      limit: LIMIT,
      maxFilesPerArchive: MAX_FILES_PER_ARCHIVE,
      maxBytesPerFile: MAX_BYTES_PER_FILE,
      force: FORCE,
    },
    selectedArchiveCount: archives.length,
    processedArchiveCount: 0,
    extractedFileCount: 0,
    skippedExistingCount: 0,
    skippedNonTextCount: 0,
    errorCount: 0,
    archives: [],
  };

  for (const asset of archives) {
    const zipPath = path.join(SOURCE_ROOT, asset.localPath);
    const archiveRecord = {
      id: asset.id,
      name: asset.name,
      localZipPath: asset.localPath,
      directDownloadUrl: asset.directDownloadUrl,
      selectedEntries: 0,
      extractedFiles: [],
      skippedExisting: 0,
      skippedNonText: 0,
      errors: [],
    };

    try {
      const entries = listZipEntries(zipPath);
      const selected = selectEntries(entries);
      archiveRecord.selectedEntries = selected.length;

      for (const [index, entryName] of selected.entries()) {
        const relativeOutputPath = relativeZipTextPath(asset.id, entryName, index + 1);
        const outputPath = path.join(SOURCE_ROOT, relativeOutputPath);

        if (fs.existsSync(outputPath) && !FORCE) {
          archiveRecord.skippedExisting += 1;
          run.skippedExistingCount += 1;
          continue;
        }

        try {
          const buffer = extractEntryBuffer(zipPath, entryName);
          if (buffer.length > MAX_BYTES_PER_FILE) {
            archiveRecord.skippedNonText += 1;
            run.skippedNonTextCount += 1;
            continue;
          }

          let normalized = '';
          if (extensionOf(entryName) === 'zip') {
            const relativeTempPath = relativeTempZipPath(asset.id, entryName, index + 1);
            const tempPath = path.join(SOURCE_ROOT, relativeTempPath);
            ensureDir(path.dirname(tempPath));
            fs.writeFileSync(tempPath, buffer);
            const nestedEntries = selectNestedEntries(listZipEntriesFromFile(tempPath));
            if (!nestedEntries.length) {
              archiveRecord.skippedNonText += 1;
              run.skippedNonTextCount += 1;
              continue;
            }
            let nestedAny = false;
            for (const [nestedIndex, nestedEntryName] of nestedEntries.entries()) {
              try {
                const nestedBuffer = extractEntryBuffer(tempPath, nestedEntryName);
                if (nestedBuffer.length > MAX_BYTES_PER_FILE) continue;
                let nestedNormalized = '';
                if (extensionOf(nestedEntryName) === 'pdf') {
                  const nestedPdfRelative = relativeTempPdfPath(asset.id, `${entryName}__${nestedEntryName}`, nestedIndex + 1);
                  const nestedPdfPath = path.join(SOURCE_ROOT, nestedPdfRelative);
                  ensureDir(path.dirname(nestedPdfPath));
                  fs.writeFileSync(nestedPdfPath, nestedBuffer);
                  nestedNormalized = normalizeWhitespace(await extractPdfText(nestedPdfPath));
                } else {
                  nestedNormalized = normalizeWhitespace(decodeBuffer(nestedBuffer));
                }
                if (!looksHumanText(nestedNormalized)) continue;
                const nestedRelativeOutputPath = relativeZipTextPath(asset.id, `${entryName}__${nestedEntryName}`, nestedIndex + 1);
                const nestedOutputPath = path.join(SOURCE_ROOT, nestedRelativeOutputPath);
                if (fs.existsSync(nestedOutputPath) && !FORCE) {
                  archiveRecord.skippedExisting += 1;
                  run.skippedExistingCount += 1;
                  continue;
                }
                ensureDir(path.dirname(nestedOutputPath));
                fs.writeFileSync(nestedOutputPath, nestedNormalized + '\n', 'utf8');
                archiveRecord.extractedFiles.push({
                  entryName: `${entryName}::${nestedEntryName}`,
                  outputPath: nestedRelativeOutputPath,
                  textLength: nestedNormalized.length,
                  sha256: sha256Text(nestedNormalized),
                });
                run.extractedFileCount += 1;
                nestedAny = true;
              } catch (error) {
                archiveRecord.errors.push({
                  entryName: `${entryName}::${nestedEntryName}`,
                  error: error.message.split('\n')[0],
                });
                run.errorCount += 1;
              }
            }
            if (!nestedAny) {
              archiveRecord.skippedNonText += 1;
              run.skippedNonTextCount += 1;
            }
            continue;
          } else if (extensionOf(entryName) === 'pdf') {
            const relativeTempPath = relativeTempPdfPath(asset.id, entryName, index + 1);
            const tempPath = path.join(SOURCE_ROOT, relativeTempPath);
            ensureDir(path.dirname(tempPath));
            fs.writeFileSync(tempPath, buffer);
            normalized = normalizeWhitespace(await extractPdfText(tempPath));
          } else {
            const decoded = decodeBuffer(buffer);
            normalized = normalizeWhitespace(decoded);
          }
          if (!looksHumanText(normalized)) {
            archiveRecord.skippedNonText += 1;
            run.skippedNonTextCount += 1;
            continue;
          }

          ensureDir(path.dirname(outputPath));
          fs.writeFileSync(outputPath, normalized + '\n', 'utf8');
          archiveRecord.extractedFiles.push({
            entryName,
            outputPath: relativeOutputPath,
            textLength: normalized.length,
            sha256: sha256Text(normalized),
          });
          run.extractedFileCount += 1;
        } catch (error) {
          archiveRecord.errors.push({
            entryName,
            error: error.message.split('\n')[0],
          });
          run.errorCount += 1;
        }
      }

      run.processedArchiveCount += 1;
    } catch (error) {
      archiveRecord.errors.push({ entryName: '', error: error.message.split('\n')[0] });
      run.errorCount += 1;
    }

    run.archives.push(archiveRecord);
  }

  previousManifest.runs = Array.isArray(previousManifest.runs) ? previousManifest.runs : [];
  previousManifest.runs.unshift(run);
  previousManifest.runs = previousManifest.runs.slice(0, 20);
  previousManifest.lastRun = run;

  writeJson(MANIFEST_PATH, previousManifest);
  refreshReadme(run);

  console.log(JSON.stringify({
    success: true,
    selectedArchiveCount: run.selectedArchiveCount,
    processedArchiveCount: run.processedArchiveCount,
    extractedFileCount: run.extractedFileCount,
    skippedExistingCount: run.skippedExistingCount,
    skippedNonTextCount: run.skippedNonTextCount,
    errorCount: run.errorCount,
    manifest: MANIFEST_PATH,
  }, null, 2));
}

await main();
