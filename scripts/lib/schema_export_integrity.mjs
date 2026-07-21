export function upsertManifestFile(files, file) {
  const index = files.findIndex((entry) => entry.fileName === file.fileName);
  if (index === -1) {
    files.push(file);
  } else {
    files[index] = file;
  }
}

export function assertUniqueIds(rows, fileName) {
  const seen = new Set();
  const duplicates = new Set();

  for (const row of rows) {
    if (seen.has(row.id)) duplicates.add(row.id);
    seen.add(row.id);
  }

  if (duplicates.size > 0) {
    const sample = [...duplicates].slice(0, 5).join(', ');
    throw new Error(`${fileName} contains ${duplicates.size} duplicate IDs: ${sample}`);
  }
}

export function nextSectionOccurrence(occurrences, sourceDocument, sectionTitle) {
  const key = `${sourceDocument}\u0000${sectionTitle}`;
  const occurrence = (occurrences.get(key) || 0) + 1;
  occurrences.set(key, occurrence);
  return occurrence;
}
