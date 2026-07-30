-- InsERTGTSchema metadata export templates (live MSSQL path)
-- Target: InsERT GT MSSQL Schema
-- Namespace: InsERTGTSchema
-- Database: pomagier
--
-- SQL Server catalog metadata only, no business rows.

-- ============================================================
-- database_instance.csv
-- ============================================================
SELECT
  CONCAT(d.name, ':DATABASE') AS id,
  d.name AS name,
  CONCAT('Database metadata entry for ', d.name, ' in InsERT GT.') AS description,
  'database_instance' AS semanticType,
  d.name AS sqlName,
  'COMPANY' AS databaseRole,
  'dbo' AS schemaName,
  'MSSQL' AS platform,
  CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(200)) AS engineVersion
FROM sys.databases AS d
WHERE d.name = DB_NAME();

-- ============================================================
-- table.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':TABLE:', s.name, '.', t.name) AS id,
  t.name AS name,
  CONCAT('Table ', s.name, '.', t.name, ' in InsERT GT database.') AS description,
  'table' AS semanticType,
  CONCAT(DB_NAME(), ':DATABASE') AS databaseRefId,
  CONCAT(s.name, '.', t.name) AS sqlName,
  s.name AS schemaName,
  'TABLE' AS objectKind,
  CONCAT(t.name, '.HTML') AS documentationRef,
  LEFT(t.name, 3) AS moduleHint
FROM sys.tables AS t
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
ORDER BY t.name;

-- ============================================================
-- column.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':TABLE:', s.name, '.', t.name, ':COLUMN:', c.name) AS id,
  c.name AS name,
  CONCAT('Column ', c.name, ' of ', s.name, '.', t.name, ' (', TYPE_NAME(c.user_type_id), IIF(TYPE_NAME(c.user_type_id) != TYPE_NAME(c.system_type_id), CONCAT(' alias ', TYPE_NAME(c.system_type_id)), ''), ')') AS description,
  'column' AS semanticType,
  CONCAT(DB_NAME(), ':TABLE:', s.name, '.', t.name) AS tableRefId,
  c.name AS sqlName,
  c.column_id AS ordinalPosition,
  TYPE_NAME(c.user_type_id) AS dataType,
  CONCAT(TYPE_NAME(c.user_type_id), IIF(TYPE_NAME(c.user_type_id) != TYPE_NAME(c.system_type_id), CONCAT(' alias ', TYPE_NAME(c.system_type_id)), ''), IIF(c.max_length = -1, '(max)', CONCAT('(', c.max_length, IIF(c.precision > 0, CONCAT(',', c.scale), ''), ')')), IIF(c.is_nullable = 1, ' NULL', ' NOT NULL')) AS fullDataType,
  CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END AS nullable,
  OBJECT_DEFINITION(c.default_object_id) AS defaultDefinition,
  CASE WHEN c.default_object_id != 0 THEN 'ACCESSIBLE' WHEN c.default_object_id = 0 AND EXISTS (SELECT 1 FROM sys.default_constraints WHERE parent_column_id = c.column_id AND parent_object_id = c.object_id) THEN 'INACCESSIBLE' ELSE 'NONE' END AS defaultDefinitionAccessState,
  cc.definition AS computedDefinition,
  CASE WHEN cc.definition IS NOT NULL THEN 'ACCESSIBLE' ELSE 'NONE' END AS computedDefinitionAccessState,
  c.collation_name AS collationName,
  CASE WHEN c.is_identity = 1 THEN 'YES' ELSE 'NO' END AS isIdentity,
  CASE WHEN c.is_computed = 1 THEN 'YES' ELSE 'NO' END AS isComputed,
  '' AS keyRole
FROM sys.columns AS c
JOIN sys.tables AS t ON t.object_id = c.object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
LEFT JOIN sys.computed_columns AS cc ON cc.object_id = c.object_id AND cc.column_id = c.column_id
ORDER BY s.name, t.name, c.column_id;

-- ============================================================
-- primary_key.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':PRIMARY_KEY:', s.name, '.', t.name, '.', k.name) AS id,
  k.name AS name,
  CONCAT('Primary key ', k.name, ' on ', s.name, '.', t.name) AS description,
  'primary_key' AS semanticType,
  CONCAT(DB_NAME(), ':TABLE:', s.name, '.', t.name) AS tableRefId,
  CONCAT(s.name, '.', k.name) AS sqlName,
  (SELECT STRING_AGG(c2.name, ', ') FROM sys.index_columns AS ic2 JOIN sys.columns AS c2 ON c2.object_id = ic2.object_id AND c2.column_id = ic2.column_id WHERE ic2.object_id = i.object_id AND ic2.index_id = i.index_id AND ic2.is_included_column = 0) AS columnList
FROM sys.indexes AS i
JOIN sys.tables AS t ON t.object_id = i.object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
JOIN sys.key_constraints AS k ON k.parent_object_id = i.object_id AND k.unique_index_id = i.index_id AND k.type = 'PK'
ORDER BY s.name, t.name;

-- ============================================================
-- foreign_key.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':FOREIGN_KEY:', s.name, '.', fk.name) AS id,
  fk.name AS name,
  CONCAT('Foreign key ', fk.name, ' from ', s.name, '.', OBJECT_NAME(fk.parent_object_id), ' to ', SCHEMA_NAME(s_ref.schema_id), '.', OBJECT_NAME(fk.referenced_object_id)) AS description,
  'foreign_key' AS semanticType,
  CONCAT(DB_NAME(), ':TABLE:', s.name, '.', OBJECT_NAME(fk.parent_object_id)) AS tableRefId,
  CONCAT(DB_NAME(), ':TABLE:', SCHEMA_NAME(s_ref.schema_id), '.', OBJECT_NAME(fk.referenced_object_id)) AS referencedTableRefId,
  CONCAT(s.name, '.', fk.name) AS sqlName,
  (SELECT STRING_AGG(CONCAT(pc.name, '->', rc.name), '; ') FROM sys.foreign_key_columns AS fkc JOIN sys.columns AS pc ON pc.object_id = fkc.parent_object_id AND pc.column_id = fkc.parent_column_id JOIN sys.columns AS rc ON rc.object_id = fkc.referenced_object_id AND rc.column_id = fkc.referenced_column_id WHERE fkc.constraint_object_id = fk.object_id) AS columnMapping,
  CASE WHEN fk.delete_referential_action = 0 THEN 'NO_ACTION' WHEN fk.delete_referential_action = 1 THEN 'CASCADE' WHEN fk.delete_referential_action = 2 THEN 'SET_NULL' ELSE 'SET_DEFAULT' END AS deleteAction,
  CASE WHEN fk.update_referential_action = 0 THEN 'NO_ACTION' WHEN fk.update_referential_action = 1 THEN 'CASCADE' WHEN fk.update_referential_action = 2 THEN 'SET_NULL' ELSE 'SET_DEFAULT' END AS updateAction,
  CASE WHEN fk.is_disabled = 1 THEN 'YES' ELSE 'NO' END AS isDisabled
FROM sys.foreign_keys AS fk
JOIN sys.tables AS t ON t.object_id = fk.parent_object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
JOIN sys.objects AS o_ref ON o_ref.object_id = fk.referenced_object_id
JOIN sys.schemas AS s_ref ON s_ref.schema_id = o_ref.schema_id
ORDER BY s.name, fk.name;

-- ============================================================
-- index.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':INDEX:', s.name, '.', t.name, '.', i.name) AS id,
  i.name AS name,
  CONCAT(IIF(i.is_unique = 1, 'UNIQUE ', ''), IIF(i.type_desc = 'NONCLUSTERED', 'NONCLUSTERED ', ''), 'INDEX ', i.name, ' on ', s.name, '.', t.name) AS description,
  'index' AS semanticType,
  CONCAT(DB_NAME(), ':TABLE:', s.name, '.', t.name) AS tableRefId,
  CONCAT(s.name, '.', i.name) AS sqlName,
  i.type_desc AS indexType,
  CASE WHEN i.is_unique = 1 THEN 'UNIQUE' ELSE 'NONUNIQUE' END AS uniqueness,
  (SELECT STRING_AGG(c2.name, ', ') FROM sys.index_columns AS ic2 JOIN sys.columns AS c2 ON c2.object_id = ic2.object_id AND c2.column_id = ic2.column_id WHERE ic2.object_id = i.object_id AND ic2.index_id = i.index_id AND ic2.is_included_column = 0) AS columnList,
  (SELECT STRING_AGG(c2.name, ', ') FROM sys.index_columns AS ic2 JOIN sys.columns AS c2 ON c2.object_id = ic2.object_id AND c2.column_id = ic2.column_id WHERE ic2.object_id = i.object_id AND ic2.index_id = i.index_id AND ic2.is_included_column = 1) AS includedColumns,
  i.filter_definition AS filterDefinition
FROM sys.indexes AS i
JOIN sys.tables AS t ON t.object_id = i.object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
LEFT JOIN sys.key_constraints AS k ON k.parent_object_id = i.object_id AND k.unique_index_id = i.index_id AND k.type IN ('PK', 'UQ')
WHERE k.name IS NULL
ORDER BY s.name, t.name, i.name;

-- ============================================================
-- constraint.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':CONSTRAINT:', s.name, '.', t.name, '.', dc.name) AS id,
  dc.name AS name,
  CONCAT('DEFAULT constraint ', dc.name, ' on ', s.name, '.', t.name, '.', c.name) AS description,
  'constraint' AS semanticType,
  CONCAT(DB_NAME(), ':TABLE:', s.name, '.', t.name) AS tableRefId,
  CONCAT(s.name, '.', dc.name) AS sqlName,
  'DEFAULT' AS constraintType,
  dc.definition AS definition,
  'ACCESSIBLE' AS definitionAccessState
FROM sys.default_constraints AS dc
JOIN sys.tables AS t ON t.object_id = dc.parent_object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
JOIN sys.columns AS c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
UNION ALL
SELECT
  CONCAT(DB_NAME(), ':CONSTRAINT:', s.name, '.', t.name, '.', cc.name) AS id,
  cc.name AS name,
  CONCAT('CHECK constraint ', cc.name, ' on ', s.name, '.', t.name) AS description,
  'constraint' AS semanticType,
  CONCAT(DB_NAME(), ':TABLE:', s.name, '.', t.name) AS tableRefId,
  CONCAT(s.name, '.', cc.name) AS sqlName,
  'CHECK' AS constraintType,
  cc.definition AS definition,
  'ACCESSIBLE' AS definitionAccessState
FROM sys.check_constraints AS cc
JOIN sys.tables AS t ON t.object_id = cc.parent_object_id
JOIN sys.schemas AS s ON s.schema_id = t.schema_id
ORDER BY sqlName;

-- ============================================================
-- view.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':VIEW:', s.name, '.', v.name) AS id,
  v.name AS name,
  CONCAT('View ', s.name, '.', v.name, ' in InsERT GT database.') AS description,
  'view' AS semanticType,
  CONCAT(DB_NAME(), ':DATABASE') AS databaseRefId,
  CONCAT(s.name, '.', v.name) AS sqlName,
  s.name AS schemaName,
  OBJECT_DEFINITION(v.object_id) AS definition,
  LEFT(OBJECT_DEFINITION(v.object_id), 800) AS definitionPreview,
  CONVERT(nvarchar(64), HASHBYTES('SHA2_256', OBJECT_DEFINITION(v.object_id)), 2) AS definitionHash,
  CAST(LEN(OBJECT_DEFINITION(v.object_id)) AS nvarchar(10)) AS definitionLength,
  CASE WHEN OBJECT_DEFINITION(v.object_id) IS NOT NULL THEN 'ACCESSIBLE' ELSE 'INACCESSIBLE' END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(v.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN OBJECTPROPERTYEX(v.object_id, 'ExecIsAnsiNullsOn') = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN OBJECTPROPERTYEX(v.object_id, 'ExecIsQuotedIdentOn') = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  'NO' AS isSchemaBound,
  '' AS dependencySummary
FROM sys.views AS v
JOIN sys.schemas AS s ON s.schema_id = v.schema_id
ORDER BY v.name;

-- ============================================================
-- stored_procedure.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':PROCEDURE:', s.name, '.', p.name) AS id,
  p.name AS name,
  CONCAT('Stored procedure ', s.name, '.', p.name, ' in InsERT GT database.') AS description,
  'stored_procedure' AS semanticType,
  CONCAT(DB_NAME(), ':DATABASE') AS databaseRefId,
  CONCAT(s.name, '.', p.name) AS sqlName,
  s.name AS schemaName,
  OBJECT_DEFINITION(p.object_id) AS definition,
  LEFT(OBJECT_DEFINITION(p.object_id), 800) AS definitionPreview,
  CONVERT(nvarchar(64), HASHBYTES('SHA2_256', OBJECT_DEFINITION(p.object_id)), 2) AS definitionHash,
  CAST(LEN(OBJECT_DEFINITION(p.object_id)) AS nvarchar(10)) AS definitionLength,
  CASE WHEN OBJECT_DEFINITION(p.object_id) IS NOT NULL THEN 'ACCESSIBLE' ELSE 'INACCESSIBLE' END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(p.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN OBJECTPROPERTYEX(p.object_id, 'ExecIsAnsiNullsOn') = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN OBJECTPROPERTYEX(p.object_id, 'ExecIsQuotedIdentOn') = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  'NO' AS isSchemaBound,
  COUNT(sp.parameter_id) AS parameterCount
FROM sys.procedures AS p
JOIN sys.schemas AS s ON s.schema_id = p.schema_id
LEFT JOIN sys.parameters AS sp ON sp.object_id = p.object_id
WHERE p.type = 'P'
GROUP BY p.object_id, p.name, s.name
ORDER BY p.name;

-- ============================================================
-- function.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':FUNCTION:', s.name, '.', p.name) AS id,
  p.name AS name,
  CONCAT(IIF(p.type = 'FN', 'Scalar', IIF(p.type = 'IF', 'Inline table-valued', 'Multi-statement table-valued')), ' function ', s.name, '.', p.name, ' in InsERT GT database.') AS description,
  'function' AS semanticType,
  CONCAT(DB_NAME(), ':DATABASE') AS databaseRefId,
  CONCAT(s.name, '.', p.name) AS sqlName,
  s.name AS schemaName,
  IIF(p.type = 'FN', 'SCALAR', IIF(p.type = 'IF', 'INLINE_TABLE_VALUED', 'TABLE_VALUED')) AS functionType,
  OBJECT_DEFINITION(p.object_id) AS definition,
  LEFT(OBJECT_DEFINITION(p.object_id), 800) AS definitionPreview,
  CONVERT(nvarchar(64), HASHBYTES('SHA2_256', OBJECT_DEFINITION(p.object_id)), 2) AS definitionHash,
  CAST(LEN(OBJECT_DEFINITION(p.object_id)) AS nvarchar(10)) AS definitionLength,
  CASE WHEN OBJECT_DEFINITION(p.object_id) IS NOT NULL THEN 'ACCESSIBLE' ELSE 'INACCESSIBLE' END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(p.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN OBJECTPROPERTYEX(p.object_id, 'ExecIsAnsiNullsOn') = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN OBJECTPROPERTYEX(p.object_id, 'ExecIsQuotedIdentOn') = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  'NO' AS isSchemaBound,
  COUNT(sp.parameter_id) AS parameterCount
FROM sys.objects AS p
JOIN sys.schemas AS s ON s.schema_id = p.schema_id
LEFT JOIN sys.parameters AS sp ON sp.object_id = p.object_id
WHERE p.type IN ('FN', 'IF', 'TF')
GROUP BY p.object_id, p.name, s.name, p.type
ORDER BY p.name;

-- ============================================================
-- trigger.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':TRIGGER:', OBJECT_SCHEMA_NAME(tr.object_id), '.', tr.name) AS id,
  tr.name AS name,
  CONCAT('Trigger ', OBJECT_SCHEMA_NAME(tr.object_id), '.', tr.name, ' on ', OBJECT_NAME(tr.parent_id)) AS description,
  'trigger' AS semanticType,
  CONCAT(DB_NAME(), ':DATABASE') AS databaseRefId,
  CONCAT(OBJECT_SCHEMA_NAME(tr.object_id), '.', tr.name) AS sqlName,
  OBJECT_SCHEMA_NAME(tr.object_id) AS schemaName,
  CONCAT(DB_NAME(), ':TABLE:', OBJECT_SCHEMA_NAME(o.schema_id), '.', OBJECT_NAME(tr.parent_id)) AS parentObjectRefId,
  '' AS triggerScope,
  OBJECT_DEFINITION(tr.object_id) AS definition,
  LEFT(OBJECT_DEFINITION(tr.object_id), 800) AS definitionPreview,
  CONVERT(nvarchar(64), HASHBYTES('SHA2_256', ISNULL(OBJECT_DEFINITION(tr.object_id), '')), 2) AS definitionHash,
  CAST(LEN(ISNULL(OBJECT_DEFINITION(tr.object_id), '')) AS nvarchar(10)) AS definitionLength,
  CASE WHEN OBJECT_DEFINITION(tr.object_id) IS NOT NULL THEN 'ACCESSIBLE' ELSE 'INACCESSIBLE' END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(tr.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN OBJECTPROPERTYEX(tr.object_id, 'ExecIsAnsiNullsOn') = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN OBJECTPROPERTYEX(tr.object_id, 'ExecIsQuotedIdentOn') = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  'NO' AS isSchemaBound
FROM sys.triggers AS tr
JOIN sys.objects AS o ON o.object_id = tr.parent_id
ORDER BY tr.name;

-- ============================================================
-- parameter.csv
-- ============================================================
SELECT
  CONCAT(DB_NAME(), ':PARAMETER:', o.type_desc, ':', SCHEMA_NAME(o.schema_id) COLLATE Polish_CI_AS, '.', OBJECT_NAME(sp.object_id), ':', sp.name) AS id,
  sp.name AS name,
  CONCAT('Parameter ', sp.name, ' of ', o.type_desc, ' ', SCHEMA_NAME(o.schema_id) COLLATE Polish_CI_AS, '.', OBJECT_NAME(sp.object_id)) AS description,
  'parameter' AS semanticType,
  CONCAT(DB_NAME(), ':', IIF(o.type IN ('P', 'PC'), 'PROCEDURE', IIF(o.type IN ('FN', 'IF', 'TF'), 'FUNCTION', 'OTHER')), ':', SCHEMA_NAME(o.schema_id) COLLATE Polish_CI_AS, '.', OBJECT_NAME(sp.object_id)) AS objectRefId,
  sp.name AS sqlName,
  IIF(o.type IN ('P', 'PC'), 'PROCEDURE', IIF(o.type IN ('FN', 'IF', 'TF'), 'FUNCTION', 'OTHER')) AS objectKind,
  sp.parameter_id AS ordinalPosition,
  TYPE_NAME(sp.user_type_id) AS dataType,
  sp.max_length AS maxLength,
  sp.precision AS precisionValue,
  sp.scale AS scaleValue,
  CASE WHEN sp.is_output = 1 THEN 'YES' ELSE 'NO' END AS isOutput,
  CASE WHEN sp.default_value IS NOT NULL OR sp.has_default_value = 1 THEN 'YES' ELSE 'NO' END AS hasDefaultValue
FROM sys.parameters AS sp
JOIN sys.objects AS o ON o.object_id = sp.object_id
ORDER BY OBJECT_NAME(sp.object_id), sp.parameter_id;
