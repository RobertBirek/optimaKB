-- ComarchOptimaSchema metadata export templates
-- Target project: Comarch Optima ERP MSSQL Schema
-- Namespace: ComarchOptimaSchema
--
-- Source scope:
-- - SQL Server catalog metadata only
-- - no business rows from user tables
-- - databases: CDN_TEST, CDN_KNF_Konfiguracja

-- ============================================================
-- database_instance.csv
-- ============================================================
SELECT
  CONCAT(d.name, ':DATABASE') AS id,
  d.name AS name,
  CONCAT('Database metadata entry for ', d.name, ' in Comarch ERP Optima MSSQL.') AS description,
  'database_instance' AS semanticType,
  d.name AS sqlName,
  CASE
    WHEN d.name = 'CDN_TEST' THEN 'COMPANY'
    WHEN d.name = 'CDN_KNF_Konfiguracja' THEN 'CONFIGURATION'
    ELSE 'OTHER'
  END AS databaseRole,
  'CDN' AS schemaName,
  'MSSQL' AS platform,
  CAST(SERVERPROPERTY('ProductVersion') AS nvarchar(200)) AS engineVersion
FROM sys.databases AS d
WHERE d.name IN ('CDN_TEST', 'CDN_KNF_Konfiguracja');

-- ============================================================
-- table.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:TABLE:', s.name, '.', t.name) AS id,
  t.name AS name,
  CONCAT('Table ', s.name, '.', t.name, ' in company database CDN_TEST.') AS description,
  'table' AS semanticType,
  'CDN_TEST:DATABASE' AS databaseRefId,
  CONCAT(s.name, '.', t.name) AS sqlName,
  s.name AS schemaName,
  'TABLE' AS objectKind,
  CONCAT('F_', t.name, '.HTML') AS documentationRef,
  LEFT(t.name, 3) AS moduleHint
FROM [CDN_TEST].sys.tables AS t
JOIN [CDN_TEST].sys.schemas AS s
  ON s.schema_id = t.schema_id
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:TABLE:', s.name, '.', t.name) AS id,
  t.name AS name,
  CONCAT('Table ', s.name, '.', t.name, ' in configuration database CDN_KNF_Konfiguracja.') AS description,
  'table' AS semanticType,
  'CDN_KNF_Konfiguracja:DATABASE' AS databaseRefId,
  CONCAT(s.name, '.', t.name) AS sqlName,
  s.name AS schemaName,
  'TABLE' AS objectKind,
  CONCAT('K_', t.name, '.HTML') AS documentationRef,
  LEFT(t.name, 3) AS moduleHint
FROM [CDN_KNF_Konfiguracja].sys.tables AS t
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS s
  ON s.schema_id = t.schema_id;

-- ============================================================
-- column.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:COLUMN:', s.name, '.', t.name, '.', c.name) AS id,
  c.name AS name,
  CONCAT(
    'Column ', s.name, '.', t.name, '.', c.name,
    ' type=', ty.name,
    '; nullable=', CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END
  ) AS description,
  'column' AS semanticType,
  CONCAT('CDN_TEST:TABLE:', s.name, '.', t.name) AS tableRefId,
  c.name AS sqlName,
  CAST(c.column_id AS nvarchar(50)) AS ordinalPosition,
  ty.name AS dataType,
  CASE
    WHEN ty.name IN ('varchar', 'char', 'varbinary', 'binary') AND c.max_length <> -1 THEN CONCAT(ty.name, '(', c.max_length, ')')
    WHEN ty.name IN ('nvarchar', 'nchar') AND c.max_length <> -1 THEN CONCAT(ty.name, '(', c.max_length / 2, ')')
    WHEN ty.name IN ('varchar', 'nvarchar', 'varbinary') AND c.max_length = -1 THEN CONCAT(ty.name, '(max)')
    WHEN ty.name IN ('decimal', 'numeric') THEN CONCAT(ty.name, '(', c.precision, ',', c.scale, ')')
    WHEN ty.name IN ('datetime2', 'datetimeoffset', 'time') THEN CONCAT(ty.name, '(', c.scale, ')')
    ELSE ty.name
  END AS fullDataType,
  CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END AS nullable,
  dc.definition AS defaultDefinition,
  CASE
    WHEN dc.object_id IS NULL THEN 'NOT_APPLICABLE'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 1 AND dc.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN dc.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS defaultDefinitionAccessState,
  cc.definition AS computedDefinition,
  CASE
    WHEN c.is_computed = 0 THEN 'NOT_COMPUTED'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 1 AND cc.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN cc.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS computedDefinitionAccessState,
  c.collation_name AS collationName,
  CASE WHEN c.is_identity = 1 THEN 'YES' ELSE 'NO' END AS isIdentity,
  CASE WHEN c.is_computed = 1 THEN 'YES' ELSE 'NO' END AS isComputed,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM [CDN_TEST].sys.index_columns ic
      JOIN [CDN_TEST].sys.key_constraints kc
        ON kc.parent_object_id = ic.object_id
       AND kc.unique_index_id = ic.index_id
      WHERE kc.type = 'PK'
        AND ic.object_id = c.object_id
        AND ic.column_id = c.column_id
    ) AND EXISTS (
      SELECT 1
      FROM [CDN_TEST].sys.foreign_key_columns fkc
      WHERE fkc.parent_object_id = c.object_id
        AND fkc.parent_column_id = c.column_id
    ) THEN 'PRIMARY_KEY,FOREIGN_KEY'
    WHEN EXISTS (
      SELECT 1
      FROM [CDN_TEST].sys.index_columns ic
      JOIN [CDN_TEST].sys.key_constraints kc
        ON kc.parent_object_id = ic.object_id
       AND kc.unique_index_id = ic.index_id
      WHERE kc.type = 'PK'
        AND ic.object_id = c.object_id
        AND ic.column_id = c.column_id
    ) THEN 'PRIMARY_KEY'
    WHEN EXISTS (
      SELECT 1
      FROM [CDN_TEST].sys.foreign_key_columns fkc
      WHERE fkc.parent_object_id = c.object_id
        AND fkc.parent_column_id = c.column_id
    ) THEN 'FOREIGN_KEY'
    ELSE NULL
  END AS keyRole
FROM [CDN_TEST].sys.columns AS c
JOIN [CDN_TEST].sys.tables AS t
  ON t.object_id = c.object_id
JOIN [CDN_TEST].sys.schemas AS s
  ON s.schema_id = t.schema_id
JOIN [CDN_TEST].sys.types AS ty
  ON ty.user_type_id = c.user_type_id
LEFT JOIN [CDN_TEST].sys.default_constraints AS dc
  ON dc.parent_object_id = c.object_id
 AND dc.parent_column_id = c.column_id
LEFT JOIN [CDN_TEST].sys.computed_columns AS cc
  ON cc.object_id = c.object_id
 AND cc.column_id = c.column_id
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:COLUMN:', s.name, '.', t.name, '.', c.name) AS id,
  c.name AS name,
  CONCAT(
    'Column ', s.name, '.', t.name, '.', c.name,
    ' type=', ty.name,
    '; nullable=', CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END
  ) AS description,
  'column' AS semanticType,
  CONCAT('CDN_KNF_Konfiguracja:TABLE:', s.name, '.', t.name) AS tableRefId,
  c.name AS sqlName,
  CAST(c.column_id AS nvarchar(50)) AS ordinalPosition,
  ty.name AS dataType,
  CASE
    WHEN ty.name IN ('varchar', 'char', 'varbinary', 'binary') AND c.max_length <> -1 THEN CONCAT(ty.name, '(', c.max_length, ')')
    WHEN ty.name IN ('nvarchar', 'nchar') AND c.max_length <> -1 THEN CONCAT(ty.name, '(', c.max_length / 2, ')')
    WHEN ty.name IN ('varchar', 'nvarchar', 'varbinary') AND c.max_length = -1 THEN CONCAT(ty.name, '(max)')
    WHEN ty.name IN ('decimal', 'numeric') THEN CONCAT(ty.name, '(', c.precision, ',', c.scale, ')')
    WHEN ty.name IN ('datetime2', 'datetimeoffset', 'time') THEN CONCAT(ty.name, '(', c.scale, ')')
    ELSE ty.name
  END AS fullDataType,
  CASE WHEN c.is_nullable = 1 THEN 'YES' ELSE 'NO' END AS nullable,
  dc.definition AS defaultDefinition,
  CASE
    WHEN dc.object_id IS NULL THEN 'NOT_APPLICABLE'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 1 AND dc.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN dc.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS defaultDefinitionAccessState,
  cc.definition AS computedDefinition,
  CASE
    WHEN c.is_computed = 0 THEN 'NOT_COMPUTED'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 1 AND cc.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN cc.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS computedDefinitionAccessState,
  c.collation_name AS collationName,
  CASE WHEN c.is_identity = 1 THEN 'YES' ELSE 'NO' END AS isIdentity,
  CASE WHEN c.is_computed = 1 THEN 'YES' ELSE 'NO' END AS isComputed,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM [CDN_KNF_Konfiguracja].sys.index_columns ic
      JOIN [CDN_KNF_Konfiguracja].sys.key_constraints kc
        ON kc.parent_object_id = ic.object_id
       AND kc.unique_index_id = ic.index_id
      WHERE kc.type = 'PK'
        AND ic.object_id = c.object_id
        AND ic.column_id = c.column_id
    ) AND EXISTS (
      SELECT 1
      FROM [CDN_KNF_Konfiguracja].sys.foreign_key_columns fkc
      WHERE fkc.parent_object_id = c.object_id
        AND fkc.parent_column_id = c.column_id
    ) THEN 'PRIMARY_KEY,FOREIGN_KEY'
    WHEN EXISTS (
      SELECT 1
      FROM [CDN_KNF_Konfiguracja].sys.index_columns ic
      JOIN [CDN_KNF_Konfiguracja].sys.key_constraints kc
        ON kc.parent_object_id = ic.object_id
       AND kc.unique_index_id = ic.index_id
      WHERE kc.type = 'PK'
        AND ic.object_id = c.object_id
        AND ic.column_id = c.column_id
    ) THEN 'PRIMARY_KEY'
    WHEN EXISTS (
      SELECT 1
      FROM [CDN_KNF_Konfiguracja].sys.foreign_key_columns fkc
      WHERE fkc.parent_object_id = c.object_id
        AND fkc.parent_column_id = c.column_id
    ) THEN 'FOREIGN_KEY'
    ELSE NULL
  END AS keyRole
FROM [CDN_KNF_Konfiguracja].sys.columns AS c
JOIN [CDN_KNF_Konfiguracja].sys.tables AS t
  ON t.object_id = c.object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS s
  ON s.schema_id = t.schema_id
JOIN [CDN_KNF_Konfiguracja].sys.types AS ty
  ON ty.user_type_id = c.user_type_id
LEFT JOIN [CDN_KNF_Konfiguracja].sys.default_constraints AS dc
  ON dc.parent_object_id = c.object_id
 AND dc.parent_column_id = c.column_id
LEFT JOIN [CDN_KNF_Konfiguracja].sys.computed_columns AS cc
  ON cc.object_id = c.object_id
 AND cc.column_id = c.column_id;

-- ============================================================
-- primary_key.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:PRIMARY_KEY:', sc.name, '.', kc.name) AS id,
  kc.name AS name,
  CONCAT('Primary key ', kc.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'primary_key' AS semanticType,
  CONCAT('CDN_TEST:TABLE:', sc.name, '.', t.name) AS tableRefId,
  kc.name AS sqlName,
  (
    SELECT STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal)
    FROM [CDN_TEST].sys.index_columns AS ic
    JOIN [CDN_TEST].sys.columns AS c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE ic.object_id = kc.parent_object_id
      AND ic.index_id = kc.unique_index_id
  ) AS columnList
FROM [CDN_TEST].sys.key_constraints AS kc
JOIN [CDN_TEST].sys.tables AS t
  ON t.object_id = kc.parent_object_id
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
WHERE kc.type = 'PK'
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:PRIMARY_KEY:', sc.name, '.', kc.name) AS id,
  kc.name AS name,
  CONCAT('Primary key ', kc.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'primary_key' AS semanticType,
  CONCAT('CDN_KNF_Konfiguracja:TABLE:', sc.name, '.', t.name) AS tableRefId,
  kc.name AS sqlName,
  (
    SELECT STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal)
    FROM [CDN_KNF_Konfiguracja].sys.index_columns AS ic
    JOIN [CDN_KNF_Konfiguracja].sys.columns AS c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE ic.object_id = kc.parent_object_id
      AND ic.index_id = kc.unique_index_id
  ) AS columnList
FROM [CDN_KNF_Konfiguracja].sys.key_constraints AS kc
JOIN [CDN_KNF_Konfiguracja].sys.tables AS t
  ON t.object_id = kc.parent_object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
WHERE kc.type = 'PK';

-- ============================================================
-- foreign_key.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:FOREIGN_KEY:', sc.name, '.', fk.name) AS id,
  fk.name AS name,
  CONCAT('Foreign key ', fk.name, ' from ', sc.name, '.', pt.name, ' to ', rs.name, '.', rt.name, '.') AS description,
  'foreign_key' AS semanticType,
  CONCAT('CDN_TEST:TABLE:', sc.name, '.', pt.name) AS tableRefId,
  CONCAT('CDN_TEST:TABLE:', rs.name, '.', rt.name) AS referencedTableRefId,
  fk.name AS sqlName,
  (
    SELECT STRING_AGG(CONCAT(pc.name, '->', rc.name), '; ') WITHIN GROUP (ORDER BY fkc.constraint_column_id)
    FROM [CDN_TEST].sys.foreign_key_columns AS fkc
    JOIN [CDN_TEST].sys.columns AS pc
      ON pc.object_id = fkc.parent_object_id
     AND pc.column_id = fkc.parent_column_id
    JOIN [CDN_TEST].sys.columns AS rc
      ON rc.object_id = fkc.referenced_object_id
     AND rc.column_id = fkc.referenced_column_id
    WHERE fkc.constraint_object_id = fk.object_id
  ) AS columnMapping,
  fk.delete_referential_action_desc AS deleteAction,
  fk.update_referential_action_desc AS updateAction,
  CASE WHEN fk.is_disabled = 1 THEN 'YES' ELSE 'NO' END AS isDisabled
FROM [CDN_TEST].sys.foreign_keys AS fk
JOIN [CDN_TEST].sys.tables AS pt
  ON pt.object_id = fk.parent_object_id
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = pt.schema_id
JOIN [CDN_TEST].sys.tables AS rt
  ON rt.object_id = fk.referenced_object_id
JOIN [CDN_TEST].sys.schemas AS rs
  ON rs.schema_id = rt.schema_id
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:FOREIGN_KEY:', sc.name, '.', fk.name) AS id,
  fk.name AS name,
  CONCAT('Foreign key ', fk.name, ' from ', sc.name, '.', pt.name, ' to ', rs.name, '.', rt.name, '.') AS description,
  'foreign_key' AS semanticType,
  CONCAT('CDN_KNF_Konfiguracja:TABLE:', sc.name, '.', pt.name) AS tableRefId,
  CONCAT('CDN_KNF_Konfiguracja:TABLE:', rs.name, '.', rt.name) AS referencedTableRefId,
  fk.name AS sqlName,
  (
    SELECT STRING_AGG(CONCAT(pc.name, '->', rc.name), '; ') WITHIN GROUP (ORDER BY fkc.constraint_column_id)
    FROM [CDN_KNF_Konfiguracja].sys.foreign_key_columns AS fkc
    JOIN [CDN_KNF_Konfiguracja].sys.columns AS pc
      ON pc.object_id = fkc.parent_object_id
     AND pc.column_id = fkc.parent_column_id
    JOIN [CDN_KNF_Konfiguracja].sys.columns AS rc
      ON rc.object_id = fkc.referenced_object_id
     AND rc.column_id = fkc.referenced_column_id
    WHERE fkc.constraint_object_id = fk.object_id
  ) AS columnMapping,
  fk.delete_referential_action_desc AS deleteAction,
  fk.update_referential_action_desc AS updateAction,
  CASE WHEN fk.is_disabled = 1 THEN 'YES' ELSE 'NO' END AS isDisabled
FROM [CDN_KNF_Konfiguracja].sys.foreign_keys AS fk
JOIN [CDN_KNF_Konfiguracja].sys.tables AS pt
  ON pt.object_id = fk.parent_object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = pt.schema_id
JOIN [CDN_KNF_Konfiguracja].sys.tables AS rt
  ON rt.object_id = fk.referenced_object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS rs
  ON rs.schema_id = rt.schema_id;

-- ============================================================
-- index.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:INDEX:', sc.name, '.', t.name, '.', i.name) AS id,
  i.name AS name,
  CONCAT('Index ', i.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'index' AS semanticType,
  CONCAT('CDN_TEST:TABLE:', sc.name, '.', t.name) AS tableRefId,
  i.name AS sqlName,
  i.type_desc AS indexType,
  CASE WHEN i.is_unique = 1 THEN 'UNIQUE' ELSE 'NON_UNIQUE' END AS uniqueness,
  (
    SELECT STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal)
    FROM [CDN_TEST].sys.index_columns AS ic
    JOIN [CDN_TEST].sys.columns AS c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE ic.object_id = i.object_id
      AND ic.index_id = i.index_id
      AND ic.is_included_column = 0
  ) AS columnList,
  (
    SELECT STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY c.column_id)
    FROM [CDN_TEST].sys.index_columns AS ic
    JOIN [CDN_TEST].sys.columns AS c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE ic.object_id = i.object_id
      AND ic.index_id = i.index_id
      AND ic.is_included_column = 1
  ) AS includedColumns,
  i.filter_definition AS filterDefinition
FROM [CDN_TEST].sys.indexes AS i
JOIN [CDN_TEST].sys.tables AS t
  ON t.object_id = i.object_id
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
WHERE i.index_id > 0
  AND i.is_hypothetical = 0
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:INDEX:', sc.name, '.', t.name, '.', i.name) AS id,
  i.name AS name,
  CONCAT('Index ', i.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'index' AS semanticType,
  CONCAT('CDN_KNF_Konfiguracja:TABLE:', sc.name, '.', t.name) AS tableRefId,
  i.name AS sqlName,
  i.type_desc AS indexType,
  CASE WHEN i.is_unique = 1 THEN 'UNIQUE' ELSE 'NON_UNIQUE' END AS uniqueness,
  (
    SELECT STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal)
    FROM [CDN_KNF_Konfiguracja].sys.index_columns AS ic
    JOIN [CDN_KNF_Konfiguracja].sys.columns AS c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE ic.object_id = i.object_id
      AND ic.index_id = i.index_id
      AND ic.is_included_column = 0
  ) AS columnList,
  (
    SELECT STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY c.column_id)
    FROM [CDN_KNF_Konfiguracja].sys.index_columns AS ic
    JOIN [CDN_KNF_Konfiguracja].sys.columns AS c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE ic.object_id = i.object_id
      AND ic.index_id = i.index_id
      AND ic.is_included_column = 1
  ) AS includedColumns,
  i.filter_definition AS filterDefinition
FROM [CDN_KNF_Konfiguracja].sys.indexes AS i
JOIN [CDN_KNF_Konfiguracja].sys.tables AS t
  ON t.object_id = i.object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
WHERE i.index_id > 0
  AND i.is_hypothetical = 0;

-- ============================================================
-- constraint.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:CONSTRAINT:', sc.name, '.', cc.name) AS id,
  cc.name AS name,
  CONCAT('Check constraint ', cc.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'constraint' AS semanticType,
  CONCAT('CDN_TEST:TABLE:', sc.name, '.', t.name) AS tableRefId,
  cc.name AS sqlName,
  'CHECK' AS constraintType,
  cc.definition AS definition,
  CASE
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 1 AND cc.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN cc.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState
FROM [CDN_TEST].sys.check_constraints AS cc
JOIN [CDN_TEST].sys.tables AS t
  ON t.object_id = cc.parent_object_id
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
UNION ALL
SELECT
  CONCAT('CDN_TEST:CONSTRAINT:', sc.name, '.', dc.name) AS id,
  dc.name AS name,
  CONCAT('Default constraint ', dc.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'constraint' AS semanticType,
  CONCAT('CDN_TEST:TABLE:', sc.name, '.', t.name) AS tableRefId,
  dc.name AS sqlName,
  'DEFAULT' AS constraintType,
  dc.definition AS definition,
  CASE
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 1 AND dc.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN dc.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState
FROM [CDN_TEST].sys.default_constraints AS dc
JOIN [CDN_TEST].sys.tables AS t
  ON t.object_id = dc.parent_object_id
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
UNION ALL
SELECT
  CONCAT('CDN_TEST:CONSTRAINT:', sc.name, '.', kc.name) AS id,
  kc.name AS name,
  CONCAT('Unique constraint ', kc.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'constraint' AS semanticType,
  CONCAT('CDN_TEST:TABLE:', sc.name, '.', t.name) AS tableRefId,
  kc.name AS sqlName,
  'UNIQUE' AS constraintType,
  (
    SELECT STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal)
    FROM [CDN_TEST].sys.index_columns AS ic
    JOIN [CDN_TEST].sys.columns AS c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE ic.object_id = kc.parent_object_id
      AND ic.index_id = kc.unique_index_id
  ) AS definition,
  'VISIBLE' AS definitionAccessState
FROM [CDN_TEST].sys.key_constraints AS kc
JOIN [CDN_TEST].sys.tables AS t
  ON t.object_id = kc.parent_object_id
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
WHERE kc.type = 'UQ'
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:CONSTRAINT:', sc.name, '.', cc.name) AS id,
  cc.name AS name,
  CONCAT('Check constraint ', cc.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'constraint' AS semanticType,
  CONCAT('CDN_KNF_Konfiguracja:TABLE:', sc.name, '.', t.name) AS tableRefId,
  cc.name AS sqlName,
  'CHECK' AS constraintType,
  cc.definition AS definition,
  CASE
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 1 AND cc.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN cc.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState
FROM [CDN_KNF_Konfiguracja].sys.check_constraints AS cc
JOIN [CDN_KNF_Konfiguracja].sys.tables AS t
  ON t.object_id = cc.parent_object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:CONSTRAINT:', sc.name, '.', dc.name) AS id,
  dc.name AS name,
  CONCAT('Default constraint ', dc.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'constraint' AS semanticType,
  CONCAT('CDN_KNF_Konfiguracja:TABLE:', sc.name, '.', t.name) AS tableRefId,
  dc.name AS sqlName,
  'DEFAULT' AS constraintType,
  dc.definition AS definition,
  CASE
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 1 AND dc.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN dc.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState
FROM [CDN_KNF_Konfiguracja].sys.default_constraints AS dc
JOIN [CDN_KNF_Konfiguracja].sys.tables AS t
  ON t.object_id = dc.parent_object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:CONSTRAINT:', sc.name, '.', kc.name) AS id,
  kc.name AS name,
  CONCAT('Unique constraint ', kc.name, ' on ', sc.name, '.', t.name, '.') AS description,
  'constraint' AS semanticType,
  CONCAT('CDN_KNF_Konfiguracja:TABLE:', sc.name, '.', t.name) AS tableRefId,
  kc.name AS sqlName,
  'UNIQUE' AS constraintType,
  (
    SELECT STRING_AGG(c.name, ', ') WITHIN GROUP (ORDER BY ic.key_ordinal)
    FROM [CDN_KNF_Konfiguracja].sys.index_columns AS ic
    JOIN [CDN_KNF_Konfiguracja].sys.columns AS c
      ON c.object_id = ic.object_id
     AND c.column_id = ic.column_id
    WHERE ic.object_id = kc.parent_object_id
      AND ic.index_id = kc.unique_index_id
  ) AS definition,
  'VISIBLE' AS definitionAccessState
FROM [CDN_KNF_Konfiguracja].sys.key_constraints AS kc
JOIN [CDN_KNF_Konfiguracja].sys.tables AS t
  ON t.object_id = kc.parent_object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = t.schema_id
WHERE kc.type = 'UQ';

-- ============================================================
-- view.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:VIEW:', sc.name, '.', v.name) AS id,
  v.name AS name,
  CONCAT('View ', sc.name, '.', v.name, ' in company database CDN_TEST.') AS description,
  'view' AS semanticType,
  'CDN_TEST:DATABASE' AS databaseRefId,
  CONCAT(sc.name, '.', v.name) AS sqlName,
  sc.name AS schemaName,
  sm.definition AS definition,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE LEFT(sm.definition, 1500) END AS definitionPreview,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), sm.definition)), 2) END AS definitionHash,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CAST(LEN(sm.definition) AS nvarchar(50)) END AS definitionLength,
  CASE
    WHEN OBJECTPROPERTYEX(v.object_id, 'IsEncrypted') = 1 THEN 'ENCRYPTED'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 1 AND sm.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN sm.object_id IS NULL THEN 'NO_MODULE_ROW'
    WHEN sm.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(v.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_ansi_nulls = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_quoted_identifier = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.is_schema_bound = 1 THEN 'YES' ELSE 'NO' END AS isSchemaBound,
  (
    SELECT STRING_AGG(CONCAT(COALESCE(d.referenced_schema_name, '?'), '.', COALESCE(d.referenced_entity_name, '?')), '; ')
    FROM [CDN_TEST].sys.sql_expression_dependencies AS d
    WHERE d.referencing_id = v.object_id
  ) AS dependencySummary
FROM [CDN_TEST].sys.views AS v
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = v.schema_id
LEFT JOIN [CDN_TEST].sys.sql_modules AS sm
  ON sm.object_id = v.object_id
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:VIEW:', sc.name, '.', v.name) AS id,
  v.name AS name,
  CONCAT('View ', sc.name, '.', v.name, ' in configuration database CDN_KNF_Konfiguracja.') AS description,
  'view' AS semanticType,
  'CDN_KNF_Konfiguracja:DATABASE' AS databaseRefId,
  CONCAT(sc.name, '.', v.name) AS sqlName,
  sc.name AS schemaName,
  sm.definition AS definition,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE LEFT(sm.definition, 1500) END AS definitionPreview,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), sm.definition)), 2) END AS definitionHash,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CAST(LEN(sm.definition) AS nvarchar(50)) END AS definitionLength,
  CASE
    WHEN OBJECTPROPERTYEX(v.object_id, 'IsEncrypted') = 1 THEN 'ENCRYPTED'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 1 AND sm.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN sm.object_id IS NULL THEN 'NO_MODULE_ROW'
    WHEN sm.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(v.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_ansi_nulls = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_quoted_identifier = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.is_schema_bound = 1 THEN 'YES' ELSE 'NO' END AS isSchemaBound,
  (
    SELECT STRING_AGG(CONCAT(COALESCE(d.referenced_schema_name, '?'), '.', COALESCE(d.referenced_entity_name, '?')), '; ')
    FROM [CDN_KNF_Konfiguracja].sys.sql_expression_dependencies AS d
    WHERE d.referencing_id = v.object_id
  ) AS dependencySummary
FROM [CDN_KNF_Konfiguracja].sys.views AS v
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = v.schema_id
LEFT JOIN [CDN_KNF_Konfiguracja].sys.sql_modules AS sm
  ON sm.object_id = v.object_id;

-- ============================================================
-- stored_procedure.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:PROCEDURE:', sc.name, '.', p.name) AS id,
  p.name AS name,
  CONCAT('Stored procedure ', sc.name, '.', p.name, ' in company database CDN_TEST.') AS description,
  'stored_procedure' AS semanticType,
  'CDN_TEST:DATABASE' AS databaseRefId,
  CONCAT(sc.name, '.', p.name) AS sqlName,
  sc.name AS schemaName,
  sm.definition AS definition,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE LEFT(sm.definition, 1500) END AS definitionPreview,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), sm.definition)), 2) END AS definitionHash,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CAST(LEN(sm.definition) AS nvarchar(50)) END AS definitionLength,
  CASE
    WHEN OBJECTPROPERTYEX(p.object_id, 'IsEncrypted') = 1 THEN 'ENCRYPTED'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 1 AND sm.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN sm.object_id IS NULL THEN 'NO_MODULE_ROW'
    WHEN sm.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(p.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_ansi_nulls = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_quoted_identifier = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.is_schema_bound = 1 THEN 'YES' ELSE 'NO' END AS isSchemaBound,
  CAST((SELECT COUNT(*) FROM [CDN_TEST].sys.parameters AS pr WHERE pr.object_id = p.object_id AND pr.parameter_id > 0) AS nvarchar(50)) AS parameterCount
FROM [CDN_TEST].sys.procedures AS p
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = p.schema_id
LEFT JOIN [CDN_TEST].sys.sql_modules AS sm
  ON sm.object_id = p.object_id
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:PROCEDURE:', sc.name, '.', p.name) AS id,
  p.name AS name,
  CONCAT('Stored procedure ', sc.name, '.', p.name, ' in configuration database CDN_KNF_Konfiguracja.') AS description,
  'stored_procedure' AS semanticType,
  'CDN_KNF_Konfiguracja:DATABASE' AS databaseRefId,
  CONCAT(sc.name, '.', p.name) AS sqlName,
  sc.name AS schemaName,
  sm.definition AS definition,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE LEFT(sm.definition, 1500) END AS definitionPreview,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), sm.definition)), 2) END AS definitionHash,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CAST(LEN(sm.definition) AS nvarchar(50)) END AS definitionLength,
  CASE
    WHEN OBJECTPROPERTYEX(p.object_id, 'IsEncrypted') = 1 THEN 'ENCRYPTED'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 1 AND sm.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN sm.object_id IS NULL THEN 'NO_MODULE_ROW'
    WHEN sm.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(p.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_ansi_nulls = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_quoted_identifier = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.is_schema_bound = 1 THEN 'YES' ELSE 'NO' END AS isSchemaBound,
  CAST((SELECT COUNT(*) FROM [CDN_KNF_Konfiguracja].sys.parameters AS pr WHERE pr.object_id = p.object_id AND pr.parameter_id > 0) AS nvarchar(50)) AS parameterCount
FROM [CDN_KNF_Konfiguracja].sys.procedures AS p
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = p.schema_id
LEFT JOIN [CDN_KNF_Konfiguracja].sys.sql_modules AS sm
  ON sm.object_id = p.object_id;

-- ============================================================
-- function.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:FUNCTION:', sc.name, '.', o.name) AS id,
  o.name AS name,
  CONCAT('Function ', sc.name, '.', o.name, ' in company database CDN_TEST.') AS description,
  'function' AS semanticType,
  'CDN_TEST:DATABASE' AS databaseRefId,
  CONCAT(sc.name, '.', o.name) AS sqlName,
  sc.name AS schemaName,
  CASE o.type
    WHEN 'FN' THEN 'SCALAR'
    WHEN 'IF' THEN 'INLINE_TABLE_VALUED'
    WHEN 'TF' THEN 'TABLE_VALUED'
    WHEN 'FS' THEN 'CLR_SCALAR'
    WHEN 'FT' THEN 'CLR_TABLE_VALUED'
    WHEN 'AF' THEN 'AGGREGATE'
    ELSE o.type_desc
  END AS functionType,
  sm.definition AS definition,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE LEFT(sm.definition, 1500) END AS definitionPreview,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), sm.definition)), 2) END AS definitionHash,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CAST(LEN(sm.definition) AS nvarchar(50)) END AS definitionLength,
  CASE
    WHEN OBJECTPROPERTYEX(o.object_id, 'IsEncrypted') = 1 THEN 'ENCRYPTED'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 1 AND sm.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN sm.object_id IS NULL THEN 'NO_MODULE_ROW'
    WHEN sm.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(o.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_ansi_nulls = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_quoted_identifier = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.is_schema_bound = 1 THEN 'YES' ELSE 'NO' END AS isSchemaBound,
  CAST((SELECT COUNT(*) FROM [CDN_TEST].sys.parameters AS pr WHERE pr.object_id = o.object_id AND pr.parameter_id > 0) AS nvarchar(50)) AS parameterCount
FROM [CDN_TEST].sys.objects AS o
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = o.schema_id
LEFT JOIN [CDN_TEST].sys.sql_modules AS sm
  ON sm.object_id = o.object_id
WHERE o.type IN ('FN', 'IF', 'TF', 'FS', 'FT', 'AF')
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:FUNCTION:', sc.name, '.', o.name) AS id,
  o.name AS name,
  CONCAT('Function ', sc.name, '.', o.name, ' in configuration database CDN_KNF_Konfiguracja.') AS description,
  'function' AS semanticType,
  'CDN_KNF_Konfiguracja:DATABASE' AS databaseRefId,
  CONCAT(sc.name, '.', o.name) AS sqlName,
  sc.name AS schemaName,
  CASE o.type
    WHEN 'FN' THEN 'SCALAR'
    WHEN 'IF' THEN 'INLINE_TABLE_VALUED'
    WHEN 'TF' THEN 'TABLE_VALUED'
    WHEN 'FS' THEN 'CLR_SCALAR'
    WHEN 'FT' THEN 'CLR_TABLE_VALUED'
    WHEN 'AF' THEN 'AGGREGATE'
    ELSE o.type_desc
  END AS functionType,
  sm.definition AS definition,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE LEFT(sm.definition, 1500) END AS definitionPreview,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), sm.definition)), 2) END AS definitionHash,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CAST(LEN(sm.definition) AS nvarchar(50)) END AS definitionLength,
  CASE
    WHEN OBJECTPROPERTYEX(o.object_id, 'IsEncrypted') = 1 THEN 'ENCRYPTED'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 1 AND sm.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN sm.object_id IS NULL THEN 'NO_MODULE_ROW'
    WHEN sm.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(o.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_ansi_nulls = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_quoted_identifier = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.is_schema_bound = 1 THEN 'YES' ELSE 'NO' END AS isSchemaBound,
  CAST((SELECT COUNT(*) FROM [CDN_KNF_Konfiguracja].sys.parameters AS pr WHERE pr.object_id = o.object_id AND pr.parameter_id > 0) AS nvarchar(50)) AS parameterCount
FROM [CDN_KNF_Konfiguracja].sys.objects AS o
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = o.schema_id
LEFT JOIN [CDN_KNF_Konfiguracja].sys.sql_modules AS sm
  ON sm.object_id = o.object_id
WHERE o.type IN ('FN', 'IF', 'TF', 'FS', 'FT', 'AF');

-- ============================================================
-- trigger.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:TRIGGER:', sc.name, '.', tr.name) AS id,
  tr.name AS name,
  CONCAT('Trigger ', sc.name, '.', tr.name, ' in company database CDN_TEST.') AS description,
  'trigger' AS semanticType,
  'CDN_TEST:DATABASE' AS databaseRefId,
  CONCAT(sc.name, '.', tr.name) AS sqlName,
  CASE
    WHEN po.type = 'U' THEN CONCAT('CDN_TEST:TABLE:', psc.name, '.', po.name)
    WHEN po.type = 'V' THEN CONCAT('CDN_TEST:VIEW:', psc.name, '.', po.name)
    ELSE NULL
  END AS parentObjectRefId,
  tr.parent_class_desc AS triggerScope,
  sm.definition AS definition,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE LEFT(sm.definition, 1500) END AS definitionPreview,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), sm.definition)), 2) END AS definitionHash,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CAST(LEN(sm.definition) AS nvarchar(50)) END AS definitionLength,
  CASE
    WHEN OBJECTPROPERTYEX(tr.object_id, 'IsEncrypted') = 1 THEN 'ENCRYPTED'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 1 AND sm.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_TEST', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN sm.object_id IS NULL THEN 'NO_MODULE_ROW'
    WHEN sm.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(tr.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_ansi_nulls = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_quoted_identifier = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.is_schema_bound = 1 THEN 'YES' ELSE 'NO' END AS isSchemaBound
FROM [CDN_TEST].sys.triggers AS tr
JOIN [CDN_TEST].sys.objects AS tro
  ON tro.object_id = tr.object_id
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = tro.schema_id
LEFT JOIN [CDN_TEST].sys.sql_modules AS sm
  ON sm.object_id = tr.object_id
LEFT JOIN [CDN_TEST].sys.objects AS po
  ON po.object_id = tr.parent_id
LEFT JOIN [CDN_TEST].sys.schemas AS psc
  ON psc.schema_id = po.schema_id
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:TRIGGER:', sc.name, '.', tr.name) AS id,
  tr.name AS name,
  CONCAT('Trigger ', sc.name, '.', tr.name, ' in configuration database CDN_KNF_Konfiguracja.') AS description,
  'trigger' AS semanticType,
  'CDN_KNF_Konfiguracja:DATABASE' AS databaseRefId,
  CONCAT(sc.name, '.', tr.name) AS sqlName,
  CASE
    WHEN po.type = 'U' THEN CONCAT('CDN_KNF_Konfiguracja:TABLE:', psc.name, '.', po.name)
    WHEN po.type = 'V' THEN CONCAT('CDN_KNF_Konfiguracja:VIEW:', psc.name, '.', po.name)
    ELSE NULL
  END AS parentObjectRefId,
  tr.parent_class_desc AS triggerScope,
  sm.definition AS definition,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE LEFT(sm.definition, 1500) END AS definitionPreview,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CONVERT(varchar(64), HASHBYTES('SHA2_256', CONVERT(varbinary(max), sm.definition)), 2) END AS definitionHash,
  CASE WHEN sm.definition IS NULL THEN NULL ELSE CAST(LEN(sm.definition) AS nvarchar(50)) END AS definitionLength,
  CASE
    WHEN OBJECTPROPERTYEX(tr.object_id, 'IsEncrypted') = 1 THEN 'ENCRYPTED'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 1 AND sm.definition IS NOT NULL THEN 'VISIBLE'
    WHEN HAS_PERMS_BY_NAME('CDN_KNF_Konfiguracja', 'DATABASE', 'VIEW DEFINITION') = 0 THEN 'NO_VIEW_DEFINITION_PERMISSION'
    WHEN sm.object_id IS NULL THEN 'NO_MODULE_ROW'
    WHEN sm.definition IS NULL THEN 'NO_DEFINITION'
    ELSE 'UNKNOWN'
  END AS definitionAccessState,
  CASE WHEN OBJECTPROPERTYEX(tr.object_id, 'IsEncrypted') = 1 THEN 'YES' ELSE 'NO' END AS isEncrypted,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_ansi_nulls = 1 THEN 'YES' ELSE 'NO' END AS usesAnsiNulls,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.uses_quoted_identifier = 1 THEN 'YES' ELSE 'NO' END AS usesQuotedIdentifier,
  CASE WHEN sm.object_id IS NULL THEN NULL WHEN sm.is_schema_bound = 1 THEN 'YES' ELSE 'NO' END AS isSchemaBound
FROM [CDN_KNF_Konfiguracja].sys.triggers AS tr
JOIN [CDN_KNF_Konfiguracja].sys.objects AS tro
  ON tro.object_id = tr.object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = tro.schema_id
LEFT JOIN [CDN_KNF_Konfiguracja].sys.sql_modules AS sm
  ON sm.object_id = tr.object_id
LEFT JOIN [CDN_KNF_Konfiguracja].sys.objects AS po
  ON po.object_id = tr.parent_id
LEFT JOIN [CDN_KNF_Konfiguracja].sys.schemas AS psc
  ON psc.schema_id = po.schema_id;

-- ============================================================
-- parameter.csv
-- ============================================================
SELECT
  CONCAT('CDN_TEST:PARAMETER:', CAST(o.type AS nvarchar(10)) COLLATE Polish_CI_AS, ':', sc.name, '.', o.name, ':', p.name) AS id,
  p.name AS name,
  CONCAT('Parameter ', p.name, ' for object ', sc.name, '.', o.name, '.') AS description,
  'parameter' AS semanticType,
  CASE
    WHEN o.type = 'P' THEN CONCAT('CDN_TEST:PROCEDURE:', sc.name, '.', o.name)
    ELSE CONCAT('CDN_TEST:FUNCTION:', sc.name, '.', o.name)
  END AS objectRefId,
  p.name AS sqlName,
  CASE
    WHEN o.type = 'P' THEN 'PROCEDURE'
    ELSE 'FUNCTION'
  END AS objectKind,
  CAST(p.parameter_id AS nvarchar(50)) AS ordinalPosition,
  ty.name AS dataType,
  CAST(p.max_length AS nvarchar(50)) AS maxLength,
  CAST(p.precision AS nvarchar(50)) AS precisionValue,
  CAST(p.scale AS nvarchar(50)) AS scaleValue,
  CASE WHEN p.is_output = 1 THEN 'YES' ELSE 'NO' END AS isOutput,
  CASE WHEN p.has_default_value = 1 THEN 'YES' ELSE 'NO' END AS hasDefaultValue
FROM [CDN_TEST].sys.parameters AS p
JOIN [CDN_TEST].sys.objects AS o
  ON o.object_id = p.object_id
JOIN [CDN_TEST].sys.schemas AS sc
  ON sc.schema_id = o.schema_id
JOIN [CDN_TEST].sys.types AS ty
  ON ty.user_type_id = p.user_type_id
WHERE p.parameter_id > 0
  AND o.type IN ('P', 'FN', 'IF', 'TF', 'FS', 'FT', 'AF')
UNION ALL
SELECT
  CONCAT('CDN_KNF_Konfiguracja:PARAMETER:', CAST(o.type AS nvarchar(10)) COLLATE Polish_CI_AS, ':', sc.name, '.', o.name, ':', p.name) AS id,
  p.name AS name,
  CONCAT('Parameter ', p.name, ' for object ', sc.name, '.', o.name, '.') AS description,
  'parameter' AS semanticType,
  CASE
    WHEN o.type = 'P' THEN CONCAT('CDN_KNF_Konfiguracja:PROCEDURE:', sc.name, '.', o.name)
    ELSE CONCAT('CDN_KNF_Konfiguracja:FUNCTION:', sc.name, '.', o.name)
  END AS objectRefId,
  p.name AS sqlName,
  CASE
    WHEN o.type = 'P' THEN 'PROCEDURE'
    ELSE 'FUNCTION'
  END AS objectKind,
  CAST(p.parameter_id AS nvarchar(50)) AS ordinalPosition,
  ty.name AS dataType,
  CAST(p.max_length AS nvarchar(50)) AS maxLength,
  CAST(p.precision AS nvarchar(50)) AS precisionValue,
  CAST(p.scale AS nvarchar(50)) AS scaleValue,
  CASE WHEN p.is_output = 1 THEN 'YES' ELSE 'NO' END AS isOutput,
  CASE WHEN p.has_default_value = 1 THEN 'YES' ELSE 'NO' END AS hasDefaultValue
FROM [CDN_KNF_Konfiguracja].sys.parameters AS p
JOIN [CDN_KNF_Konfiguracja].sys.objects AS o
  ON o.object_id = p.object_id
JOIN [CDN_KNF_Konfiguracja].sys.schemas AS sc
  ON sc.schema_id = o.schema_id
JOIN [CDN_KNF_Konfiguracja].sys.types AS ty
  ON ty.user_type_id = p.user_type_id
WHERE p.parameter_id > 0
  AND o.type IN ('P', 'FN', 'IF', 'TF', 'FS', 'FT', 'AF');

-- ============================================================
-- object_dependency.csv
-- ============================================================
WITH source_objects AS (
  SELECT
    CAST('CDN_TEST' AS nvarchar(200)) COLLATE Polish_CI_AS AS db_name,
    o.object_id,
    CAST(o.type AS nvarchar(10)) COLLATE Polish_CI_AS AS type,
    CAST(s.name AS nvarchar(256)) COLLATE Polish_CI_AS AS schema_name,
    CAST(o.name AS nvarchar(256)) COLLATE Polish_CI_AS AS object_name,
    CAST(sm.definition AS nvarchar(max)) COLLATE Polish_CI_AS AS definition
  FROM [CDN_TEST].sys.objects AS o
  JOIN [CDN_TEST].sys.schemas AS s
    ON s.schema_id = o.schema_id
  JOIN [CDN_TEST].sys.sql_modules AS sm
    ON sm.object_id = o.object_id
  WHERE o.type IN ('V', 'FN', 'IF', 'TF', 'TR')
  UNION ALL
  SELECT
    CAST('CDN_KNF_Konfiguracja' AS nvarchar(200)) COLLATE Polish_CI_AS AS db_name,
    o.object_id,
    CAST(o.type AS nvarchar(10)) COLLATE Polish_CI_AS AS type,
    CAST(s.name AS nvarchar(256)) COLLATE Polish_CI_AS AS schema_name,
    CAST(o.name AS nvarchar(256)) COLLATE Polish_CI_AS AS object_name,
    CAST(sm.definition AS nvarchar(max)) COLLATE Polish_CI_AS AS definition
  FROM [CDN_KNF_Konfiguracja].sys.objects AS o
  JOIN [CDN_KNF_Konfiguracja].sys.schemas AS s
    ON s.schema_id = o.schema_id
  JOIN [CDN_KNF_Konfiguracja].sys.sql_modules AS sm
    ON sm.object_id = o.object_id
  WHERE o.type IN ('V', 'FN', 'IF', 'TF', 'TR')
),
target_objects AS (
  SELECT
    CAST('CDN_TEST' AS nvarchar(200)) COLLATE Polish_CI_AS AS db_name,
    o.object_id,
    CAST(o.type AS nvarchar(10)) COLLATE Polish_CI_AS AS type,
    CAST(s.name AS nvarchar(256)) COLLATE Polish_CI_AS AS schema_name,
    CAST(o.name AS nvarchar(256)) COLLATE Polish_CI_AS AS object_name
  FROM [CDN_TEST].sys.objects AS o
  JOIN [CDN_TEST].sys.schemas AS s
    ON s.schema_id = o.schema_id
  WHERE o.type IN ('U', 'V', 'FN', 'IF', 'TF')
  UNION ALL
  SELECT
    CAST('CDN_KNF_Konfiguracja' AS nvarchar(200)) COLLATE Polish_CI_AS AS db_name,
    o.object_id,
    CAST(o.type AS nvarchar(10)) COLLATE Polish_CI_AS AS type,
    CAST(s.name AS nvarchar(256)) COLLATE Polish_CI_AS AS schema_name,
    CAST(o.name AS nvarchar(256)) COLLATE Polish_CI_AS AS object_name
  FROM [CDN_KNF_Konfiguracja].sys.objects AS o
  JOIN [CDN_KNF_Konfiguracja].sys.schemas AS s
    ON s.schema_id = o.schema_id
  WHERE o.type IN ('U', 'V', 'FN', 'IF', 'TF')
),
trigger_parent_dependencies AS (
  SELECT
    CONCAT('CDN_TEST:DEPENDENCY:TRIGGER_PARENT:', trs.name, '.', tr.name, '=>', pts.name, '.', pto.name) AS id,
    CONCAT(tr.name, ' => ', pto.name) AS name,
    CONCAT('Trigger ', trs.name, '.', tr.name, ' is attached to table ', pts.name, '.', pto.name, '.') AS description,
    'object_dependency' AS semanticType,
    CONCAT('CDN_TEST:TRIGGER:', trs.name, '.', tr.name) AS sourceObjectRefId,
    CONCAT('CDN_TEST:TABLE:', pts.name, '.', pto.name) AS targetObjectRefId,
    'TRIGGER' AS sourceObjectKind,
    'TABLE' AS targetObjectKind,
    'TRIGGER_PARENT_TABLE' AS dependencyType,
    CONCAT(pts.name, '.', pto.name) AS evidence
  FROM [CDN_TEST].sys.triggers AS tr
  JOIN [CDN_TEST].sys.tables AS pto
    ON pto.object_id = tr.parent_id
  JOIN [CDN_TEST].sys.schemas AS pts
    ON pts.schema_id = pto.schema_id
  JOIN [CDN_TEST].sys.schemas AS trs
    ON trs.schema_id = pto.schema_id
  UNION ALL
  SELECT
    CONCAT('CDN_KNF_Konfiguracja:DEPENDENCY:TRIGGER_PARENT:', trs.name, '.', tr.name, '=>', pts.name, '.', pto.name) AS id,
    CONCAT(tr.name, ' => ', pto.name) AS name,
    CONCAT('Trigger ', trs.name, '.', tr.name, ' is attached to table ', pts.name, '.', pto.name, '.') AS description,
    'object_dependency' AS semanticType,
    CONCAT('CDN_KNF_Konfiguracja:TRIGGER:', trs.name, '.', tr.name) AS sourceObjectRefId,
    CONCAT('CDN_KNF_Konfiguracja:TABLE:', pts.name, '.', pto.name) AS targetObjectRefId,
    'TRIGGER' AS sourceObjectKind,
    'TABLE' AS targetObjectKind,
    'TRIGGER_PARENT_TABLE' AS dependencyType,
    CONCAT(pts.name, '.', pto.name) AS evidence
  FROM [CDN_KNF_Konfiguracja].sys.triggers AS tr
  JOIN [CDN_KNF_Konfiguracja].sys.tables AS pto
    ON pto.object_id = tr.parent_id
  JOIN [CDN_KNF_Konfiguracja].sys.schemas AS pts
    ON pts.schema_id = pto.schema_id
  JOIN [CDN_KNF_Konfiguracja].sys.schemas AS trs
    ON trs.schema_id = pto.schema_id
)
SELECT
  CONCAT(src.db_name, ':DEPENDENCY:HEURISTIC:', src.type, ':', src.schema_name, '.', src.object_name, '=>', tgt.type, ':', tgt.schema_name, '.', tgt.object_name) AS id,
  CONCAT(src.object_name, ' => ', tgt.object_name) AS name,
  CONCAT('Heuristic SQL-text dependency from ', src.schema_name, '.', src.object_name, ' to ', tgt.schema_name, '.', tgt.object_name, '.') AS description,
  'object_dependency' AS semanticType,
  CASE
    WHEN src.type = 'V' THEN CONCAT(src.db_name, ':VIEW:', src.schema_name, '.', src.object_name)
    WHEN src.type IN ('FN', 'IF', 'TF') THEN CONCAT(src.db_name, ':FUNCTION:', src.schema_name, '.', src.object_name)
    WHEN src.type = 'TR' THEN CONCAT(src.db_name, ':TRIGGER:', src.schema_name, '.', src.object_name)
    ELSE NULL
  END AS sourceObjectRefId,
  CASE
    WHEN tgt.type = 'U' THEN CONCAT(tgt.db_name, ':TABLE:', tgt.schema_name, '.', tgt.object_name)
    WHEN tgt.type = 'V' THEN CONCAT(tgt.db_name, ':VIEW:', tgt.schema_name, '.', tgt.object_name)
    WHEN tgt.type IN ('FN', 'IF', 'TF') THEN CONCAT(tgt.db_name, ':FUNCTION:', tgt.schema_name, '.', tgt.object_name)
    ELSE NULL
  END AS targetObjectRefId,
  CASE
    WHEN src.type = 'V' THEN 'VIEW'
    WHEN src.type IN ('FN', 'IF', 'TF') THEN 'FUNCTION'
    WHEN src.type = 'TR' THEN 'TRIGGER'
    ELSE src.type
  END AS sourceObjectKind,
  CASE
    WHEN tgt.type = 'U' THEN 'TABLE'
    WHEN tgt.type = 'V' THEN 'VIEW'
    WHEN tgt.type IN ('FN', 'IF', 'TF') THEN 'FUNCTION'
    ELSE tgt.type
  END AS targetObjectKind,
  'HEURISTIC_SQL_TEXT_MATCH' AS dependencyType,
  CONCAT(tgt.schema_name, '.', tgt.object_name) AS evidence
FROM source_objects AS src
JOIN target_objects AS tgt
  ON tgt.db_name = src.db_name
 AND tgt.object_id <> src.object_id
 AND (
   CHARINDEX(LOWER(CONCAT('[', tgt.schema_name, '].[', tgt.object_name, ']')), LOWER(src.definition)) > 0
   OR CHARINDEX(LOWER(CONCAT(tgt.schema_name, '.', tgt.object_name)), LOWER(src.definition)) > 0
 )
WHERE NOT (
  src.type = 'TR'
  AND tgt.type IN ('V', 'FN', 'IF', 'TF')
)
UNION ALL
SELECT
  id,
  name,
  description,
  semanticType,
  sourceObjectRefId,
  targetObjectRefId,
  sourceObjectKind,
  targetObjectKind,
  dependencyType,
  evidence
FROM trigger_parent_dependencies;
