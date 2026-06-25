import fs from 'fs';

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&#([0-9]+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : '';
    })
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function truncate(value, limit = 1200) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, limit - 3)}...`;
}

function classifyDefinition(definition, compressionFlag) {
  const raw = String(definition || '').trim();
  if (!raw) return 'empty';
  if (compressionFlag === '1' || raw.startsWith('xÚ')) return 'compressed';
  if (raw.startsWith('[JS]')) return 'jscript';
  if (raw.startsWith('[SQL]')) return 'sql';
  if (raw.startsWith('<Genrap') || raw.startsWith('<GenRap') || raw.startsWith('<GenrapGrs')) return 'genrap_xml';
  if (raw.startsWith('<?xml') || raw.startsWith('<')) return 'xml';
  return 'plain_text';
}

function inferLanguage(definitionKind) {
  switch (definitionKind) {
    case 'jscript':
      return 'jscript';
    case 'sql':
      return 'sql';
    case 'genrap_xml':
    case 'xml':
      return 'xml';
    case 'compressed':
      return 'compressed';
    default:
      return 'text';
  }
}

function collectSummary(record) {
  return truncate(
    [
      record.setName && `set=${record.setName}`,
      `rodzaj=${record.WDR_RODZAJ || ''}`,
      `typ=${record.WDR_TYP || ''}`,
      `podtyp=${record.WDR_PODTYP || ''}`,
      record.definitionKind && `definition=${record.definitionKind}`,
      record.WDR_KOMPRESJA === '1' ? 'compressed=1' : 'compressed=0',
      record.WDR_WARUNEK && `warunek=${normalizeWhitespace(record.WDR_WARUNEK)}`,
      record.WDR_WARUNEKAUTO && `warunekAuto=${normalizeWhitespace(record.WDR_WARUNEKAUTO)}`,
      record.WDR_PARAMETRY && `parametry=${truncate(record.WDR_PARAMETRY, 300)}`,
    ].filter(Boolean).join(' | '),
    1400,
  );
}

export function parseOptimaManualExport(filePath) {
  if (!fs.existsSync(filePath)) {
    return { filePath, exportName: '', records: [], comboCounts: new Map(), definitionKindCounts: new Map() };
  }

  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r/g, '');
  const lines = raw.split('\n');
  const records = [];
  let currentSet = null;
  let currentRecord = null;
  let openTag = null;
  let openTarget = null;
  let openLines = [];

  function assignField(target, tag, value) {
    target[tag] = decodeXmlEntities(value);
  }

  function closeOpenField(closingLine) {
    const closeToken = `</${openTag}>`;
    const endIndex = closingLine.indexOf(closeToken);
    if (endIndex >= 0) {
      openLines.push(closingLine.slice(0, endIndex));
      assignField(openTarget, openTag, openLines.join('\n'));
      openTag = null;
      openTarget = null;
      openLines = [];
      return closingLine.slice(endIndex + closeToken.length);
    }
    openLines.push(closingLine);
    return '';
  }

  for (const line of lines) {
    let working = line;
    if (openTag) {
      working = closeOpenField(working);
      if (!working) continue;
    }

    const setOpen = working.match(/^\s*<Zestaw\s+Nazwa="([^"]*)"\s*>\s*$/);
    if (setOpen) {
      currentSet = { setName: decodeXmlEntities(setOpen[1]) };
      continue;
    }

    if (/^\s*<\/Zestaw>\s*$/.test(working)) {
      currentSet = null;
      continue;
    }

    const printOpen = working.match(/^\s*<Wydruk\s+Nazwa="([^"]*)"\s*>\s*$/);
    if (printOpen) {
      currentRecord = {
        setName: currentSet?.setName || '',
        setRodzaj: currentSet?.WdZ_Rodzaj || '',
        setWarunek: currentSet?.WdZ_Warunek || '',
        setWarunekAuto: currentSet?.WdZ_WarunekAuto || '',
        setId: currentSet?.WdZ_ID || '',
        printNameAttr: decodeXmlEntities(printOpen[1]),
      };
      continue;
    }

    if (/^\s*<\/Wydruk>\s*$/.test(working)) {
      if (currentRecord) {
        currentRecord.WDR_NAZWA = currentRecord.WDR_NAZWA || currentRecord.printNameAttr || '';
        currentRecord.definitionKind = classifyDefinition(
          currentRecord.WDR_DEFINICJA || '',
          currentRecord.WDR_KOMPRESJA || '',
        );
        currentRecord.language = inferLanguage(currentRecord.definitionKind);
        currentRecord.summary = collectSummary(currentRecord);
        records.push(currentRecord);
      }
      currentRecord = null;
      continue;
    }

    const singleTag = working.match(/^\s*<([A-Za-z0-9_]+)>([\s\S]*)<\/\1>\s*$/);
    if (singleTag) {
      if (currentRecord && singleTag[1].startsWith('WDR_')) {
        assignField(currentRecord, singleTag[1], singleTag[2]);
      } else if (currentSet && singleTag[1].startsWith('WdZ_')) {
        assignField(currentSet, singleTag[1], singleTag[2]);
      }
      continue;
    }

    const openMatch = working.match(/^\s*<([A-Za-z0-9_]+)>([\s\S]*)$/);
    if (openMatch) {
      const tag = openMatch[1];
      if ((currentRecord && tag.startsWith('WDR_')) || (currentSet && tag.startsWith('WdZ_'))) {
        openTag = tag;
        openTarget = currentRecord && tag.startsWith('WDR_') ? currentRecord : currentSet;
        openLines = [openMatch[2]];
      }
    }
  }

  const comboCounts = new Map();
  const definitionKindCounts = new Map();
  for (const record of records) {
    const combo = `${record.WDR_RODZAJ || ''}|${record.WDR_TYP || ''}|${record.WDR_PODTYP || ''}`;
    comboCounts.set(combo, (comboCounts.get(combo) || 0) + 1);
    definitionKindCounts.set(
      record.definitionKind,
      (definitionKindCounts.get(record.definitionKind) || 0) + 1,
    );
  }

  return {
    filePath,
    exportName: filePath.split('/').pop() || '',
    records,
    comboCounts,
    definitionKindCounts,
  };
}

