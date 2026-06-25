import fs from 'fs';
import path from 'path';

export function loadJsonIfExists(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export function buildCsvUpsertPayload({
  projectId,
  createUser,
  jobName,
  namespace,
  entityTypeName,
  entityTypeId,
  fileName,
  uploadedUrl,
  columns,
}) {
  const mapping = {};
  for (const columnName of columns) mapping[columnName] = [columnName];

  return {
    projectId,
    createUser,
    jobName,
    type: 'FILE_EXTRACT',
    dataSourceType: 'CSV',
    fileUrl: uploadedUrl,
    lifeCycle: 'ONCE',
    action: 'UPSERT',
    extension: JSON.stringify({
      dataSourceConfig: {
        columns: columns.map((name, index) => ({ name, index })),
        type: 'UPLOAD',
        fileName,
        fileUrl: uploadedUrl,
        ignoreHeader: true,
        structure: true,
      },
      mappingConfig: {
        mappingType: 'entityMapping',
        filter: [
          {
            s: `${namespace}.${entityTypeName}`,
            sId: entityTypeId,
            sZhName: entityTypeName,
            importSchemaCategory: 'ENTITY',
          },
        ],
        config: [
          {
            mapping,
            name: `${entityTypeName}(${namespace}.${entityTypeName})`,
            id: '1',
          },
        ],
      },
    }),
  };
}

export function refreshBuildReadme({ title, readmePath, exportManifest, uploadManifest, buildManifest }) {
  const lines = [
    `# ${title} build`,
    '',
    `Generated at: ${new Date().toISOString()}`,
    '',
    '## Export files',
    '',
    ...(exportManifest.files || []).map((file) => `- \`${file.fileName}\`: \`${file.rowCount}\``),
    '',
    '## Uploads',
    '',
    ...(uploadManifest.files || []).map((file) => `- \`${file.fileName}\`: \`${file.uploadedUrl || file.url || ''}\``),
    '',
    '## Builder jobs',
    '',
    ...(buildManifest.jobs || []).map((job) => `- \`${job.id}\` \`${job.status}\` \`${job.jobName}\``),
    '',
  ];
  fs.writeFileSync(readmePath, `${lines.join('\n')}\n`, 'utf8');
}
