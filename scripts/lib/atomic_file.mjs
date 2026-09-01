import fs from 'node:fs';
import path from 'node:path';

export function writeFileAtomically(filePath, content, encoding = 'utf8') {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const existing = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  const mode = ((existing?.mode ?? 0o664) & 0o777) | 0o200;
  const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;

  try {
    fs.writeFileSync(tempPath, content, { encoding, mode });
    fs.chmodSync(tempPath, mode);
    if (existing && process.getuid?.() === 0) {
      fs.chownSync(tempPath, existing.uid, existing.gid);
    }
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    fs.rmSync(tempPath, { force: true });
    throw error;
  }
}
