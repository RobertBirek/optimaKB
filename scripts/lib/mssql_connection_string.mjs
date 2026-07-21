import fs from 'node:fs';

export function readMssqlConnectionString(env = process.env) {
  const direct = String(env.MSSQL_CONNECTION_STRING || '').trim();
  if (direct) return direct;

  const filePath = String(env.MSSQL_CONNECTION_STRING_FILE || '').trim();
  if (filePath) {
    const value = fs.readFileSync(filePath, 'utf8').trim();
    if (value) return value;
    throw new Error(`MSSQL connection string file is empty: ${filePath}`);
  }

  throw new Error('MSSQL_CONNECTION_STRING or MSSQL_CONNECTION_STRING_FILE is required');
}
