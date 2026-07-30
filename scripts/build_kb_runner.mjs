#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';
import { readOpenSpgCookie } from './lib/openspg_auth.mjs';
import { createBuildClient } from './lib/build_client.mjs';
import { waitForBuilderJob } from './lib/build_job_wait.mjs';
import {
  buildCsvUpsertPayload,
  loadJsonIfExists,
  refreshBuildReadme,
  writeJson,
} from './lib/build_runner_core.mjs';
import { taxbellConfig } from './lib/taxbell_reference_config.mjs';
import { OPENSPG_API_BASE } from './lib/config.mjs';

const ROOT = process.env.ROOT || '/docker/openspg';
const API_BASE = OPENSPG_API_BASE;
const COOKIE = readOpenSpgCookie();
const POLL_INTERVAL_MS = 3000;
const MAX_WAIT_MS = Math.max(1, Number(process.env.OPENSPG_JOB_WAIT_TIMEOUT_MINUTES || 120)) * 60 * 1000;
const ACTIVE_JOB_MAX_AGE_MS = Math.max(1, Number(process.env.OPENSPG_ACTIVE_JOB_MAX_AGE_MINUTES || 60)) * 60 * 1000;
const TERMINAL_STATUSES = new Set(['FINISH', 'ERROR', 'SKIP', 'TERMINATE', 'SET_FINISH']);
const ACTIVE_STATUSES = new Set(['INIT', 'WAITING', 'RUNNING']);
const TAXBELL_PROJECT_MAP_PATH = path.join(ROOT, 'docs/reference/Taxbell_KB_Project_Map.json');

const PROFILES = {
  optima_reference: {
    projectId: 8,
    namespace: 'ComarchOptimaReference',
    jobPrefix: 'CORF',
    exportDir: 'exports/optima_reference/v1',
    uploadManifest: 'upload_optima_reference_manifest.json',
    buildManifest: 'build_optima_reference_jobs_manifest.json',
    readmeTitle: 'ComarchOptimaReference',
    includeShortNames: true,
    listLimit: 100,
    reuseActive: false,
    fileEntityMap: {
      'reference_document.csv': 'ReferenceDocument',
      'help_category.csv': 'HelpCategory',
      'module_area.csv': 'ModuleArea',
      'version_topic.csv': 'VersionTopic',
      'learning_guide.csv': 'LearningGuide',
      'knowledge_route.csv': 'KnowledgeRoute',
      'entry_guide.csv': 'EntryGuide',
      'chunk.csv': 'Chunk',
    },
  },
  optima_additional_functions: {
    projectId: 6,
    namespace: 'ComarchOptimaAdditionalFunctions',
    jobPrefix: 'COAF',
    exportDir: 'exports/optima_additional_functions/v1',
    uploadManifest: 'upload_additional_functions_manifest.json',
    buildManifest: 'build_additional_functions_jobs_manifest.json',
    includeShortNames: true,
    listLimit: 100,
    reuseActive: false,
    fileEntityMap: {
      'reference_document.csv': 'ReferenceDocument',
      'additional_function_capability.csv': 'FunctionCapability',
      'additional_function_entry_point.csv': 'FunctionEntryPoint',
      'additional_function_execution_mode.csv': 'FunctionExecutionMode',
      'additional_function_configuration_option.csv': 'FunctionConfigOption',
      'additional_function_rule.csv': 'FunctionRule',
      'additional_function_pattern.csv': 'FunctionPattern',
      'related_feature.csv': 'RelatedFeature',
      'file_artifact.csv': 'FileArtifact',
      'implementation_example.csv': 'ImplementationExample',
      'com_interface.csv': 'ComInterface',
      'configuration_catalog_entry.csv': 'ConfigurationCatalogEntry',
      'procedure_dictionary_entry.csv': 'ProcedureDictionaryEntry',
      'message_catalog_entry.csv': 'MessageCatalogEntry',
      'implementation_guide.csv': 'ImplementationGuide',
      'schema_touchpoint.csv': 'SchemaTouchpoint',
      'module_recipe.csv': 'ModuleRecipe',
      'chunk.csv': 'Chunk',
    },
  },
  optima_sprint: {
    projectId: 7,
    namespace: 'ComarchOptimaSprint',
    jobPrefix: 'COSP',
    exportDir: 'exports/optima_sprint/v1',
    uploadManifest: 'upload_optima_sprint_manifest.json',
    buildManifest: 'build_optima_sprint_jobs_manifest.json',
    readmeTitle: 'ComarchOptimaSprint',
    includeShortNames: true,
    listLimit: 100,
    reuseActive: false,
    fileEntityMap: {
      'reference_document.csv': 'ReferenceDocument',
      'file_artifact.csv': 'FileArtifact',
      'print_technology.csv': 'PrintTechnology',
      'print_workflow.csv': 'PrintWorkflow',
      'print_option.csv': 'PrintOption',
      'template_feature.csv': 'TemplateFeature',
      'sql_pattern.csv': 'SqlPattern',
      'diagnostic_case.csv': 'DiagnosticCase',
      'version_change.csv': 'VersionChange',
      'print_catalog.csv': 'PrintCatalog',
      'learning_resource.csv': 'LearningResource',
      'glossary_term.csv': 'GlossaryTerm',
      'schema_touchpoint.csv': 'SchemaTouchpoint',
      'module_recipe.csv': 'ModuleRecipe',
      'chunk.csv': 'Chunk',
    },
  },
  optima_partner_technical: {
    projectId: 0,
    namespace: 'ComarchOptimaPartnerTechnical',
    jobPrefix: 'COPT',
    exportDir: 'exports/optima_partner_technical/v1',
    uploadManifest: 'upload_optima_partner_technical_manifest.json',
    buildManifest: 'build_optima_partner_technical_jobs_manifest.json',
    readmeTitle: 'ComarchOptimaPartnerTechnical',
    includeShortNames: true,
    listLimit: 100,
    reuseActive: true,
    activeJobMaxAgeMinutes: 45,
    fileEntityMap: {
      'reference_document.csv': 'ReferenceDocument',
      'partner_category.csv': 'PartnerCategory',
      'partner_asset.csv': 'PartnerAsset',
      'asset_type.csv': 'AssetType',
      'version_band.csv': 'VersionBand',
      'product_area.csv': 'ProductArea',
      'cfg_entry.csv': 'CfgEntry',
      'proc_entry.csv': 'ProcEntry',
      'msg_entry.csv': 'MsgEntry',
      'com_example.csv': 'ComExample',
      'com_interface_use.csv': 'ComInterfaceUse',
      'com_schema_touchpoint.csv': 'ComSchemaTouchpoint',
      'com_module_recipe.csv': 'ComModuleRecipe',
      'knowledge_route.csv': 'KnowledgeRoute',
      'chunk.csv': 'Chunk',
    },
  },
  optima_schema_metadata: {
    projectId: 4,
    namespace: 'ComarchOptimaSchema',
    jobPrefix: 'ComarchOptimaSchema',
    exportDir: 'exports/optima_schema/v1',
    uploadManifest: 'upload_schema_metadata_manifest.json',
    buildManifest: 'build_schema_metadata_jobs_manifest.json',
    includeShortNames: true,
    listLimit: 100,
    reuseActive: false,
    fileEntityMap: {
      'database_instance.csv': 'DatabaseInstance',
      'table.csv': 'Table',
      'column.csv': 'Column',
      'primary_key.csv': 'PrimaryKey',
      'foreign_key.csv': 'ForeignKey',
      'index.csv': 'Index',
      'constraint.csv': 'Constraint',
      'view.csv': 'View',
      'stored_procedure.csv': 'StoredProcedure',
      'function.csv': 'Function',
      'trigger.csv': 'Trigger',
      'parameter.csv': 'Parameter',
      'object_dependency.csv': 'ObjectDependency',
      'table_query_guide.csv': 'TableQueryGuide',
      'join_path_guide.csv': 'JoinPathGuide',
      'sql_object_guide.csv': 'SqlObjectGuide',
      'schema_change.csv': 'SchemaChange',
      'chunk.csv': 'Chunk',
    },
  },
  optima_business_semantics: {
    projectId: Number(process.env.OPENSPG_PROJECT_ID || 15),
    namespace: 'ComarchOptimaBusinessSemantics',
    jobPrefix: 'COBS',
    exportDir: 'exports/optima_business_semantics/v1',
    uploadManifest: 'upload_business_semantics_manifest.json',
    buildManifest: 'build_business_semantics_jobs_manifest.json',
    readmeTitle: 'ComarchOptimaBusinessSemantics',
    includeShortNames: true,
    listLimit: 100,
    reuseActive: false,
    fileEntityMap: {
      'business_domain.csv': 'BusinessDomain',
      'business_description.csv': 'BusinessDescription',
      'code_meaning.csv': 'CodeMeaning',
      'business_rule.csv': 'BusinessRule',
    },
  },
  betterfly_reference: {
    projectId: 0,
    namespace: 'ComarchBetterflyReference',
    jobPrefix: 'CBRF',
    exportDir: 'exports/betterfly_reference/v1',
    uploadManifest: 'upload_betterfly_reference_manifest.json',
    buildManifest: 'build_betterfly_reference_jobs_manifest.json',
    readmeTitle: 'ComarchBetterflyReference',
    includeShortNames: true,
    listLimit: 200,
    reuseActive: true,
    activeJobMaxAgeMinutes: 45,
    fileEntityMap: {
      'reference_document.csv': 'ReferenceDocument',
      'help_category.csv': 'HelpCategory',
      'module_area.csv': 'ModuleArea',
      'api_resource.csv': 'ApiResource',
      'api_pattern.csv': 'ApiPattern',
      'learning_guide.csv': 'LearningGuide',
      'knowledge_route.csv': 'KnowledgeRoute',
      'entry_guide.csv': 'EntryGuide',
      'chunk.csv': 'Chunk',
    },
  },
  community_news: {
    projectId: Number(process.env.OPENSPG_PROJECT_ID || 11),
    namespace: 'ComarchCommunityNews',
    jobPrefix: 'CCN',
    exportDir: 'exports/community_news/v1',
    uploadManifest: 'upload_community_news_manifest.json',
    buildManifest: 'build_community_news_jobs_manifest.json',
    readmeTitle: 'ComarchCommunityNews',
    includeShortNames: true,
    listLimit: 200,
    reuseActive: true,
    activeJobMaxAgeMinutes: 30,
    fileEntityMap: {
      'reference_document.csv': 'ReferenceDocument',
      'news_topic.csv': 'NewsTopic',
      'community_attachment.csv': 'CommunityAttachment',
      'knowledge_route.csv': 'KnowledgeRoute',
      'entry_guide.csv': 'EntryGuide',
      'chunk.csv': 'Chunk',
    },
  },
  taxbell_reference: {
    projectId: 0,
    namespace: '',
    jobPrefix: '',
    exportDir: '',
    uploadManifest: '',
    buildManifest: '',
    includeShortNames: true,
    listLimit: 200,
    reuseActive: true,
    activeJobMaxAgeMinutes: 30,
    fileEntityMap: {
      'reference_document.csv': 'ReferenceDocument',
      'source_topic.csv': 'SourceTopic',
      'knowledge_route.csv': 'KnowledgeRoute',
      'entry_guide.csv': 'EntryGuide',
      'chunk.csv': 'Chunk',
    },
  },
  owa_ontology: {
    projectId: 16,
    namespace: 'OWAOntology',
    jobPrefix: 'OWAO',
    exportDir: 'exports/owa_ontology/v1',
    uploadManifest: 'upload_owa_ontology_manifest.json',
    buildManifest: 'build_owa_ontology_jobs_manifest.json',
    readmeTitle: 'OWAOntology',
    includeShortNames: true,
    listLimit: 200,
    reuseActive: true,
    activeJobMaxAgeMinutes: 30,
    fileEntityMap: {
      'ontology_entity.csv': 'OntologyEntity',
      'ontology_field.csv': 'OntologyField',
      'ontology_relation.csv': 'OntologyRelation',
      'workflow_pattern.csv': 'WorkflowPattern',
      'chunk.csv': 'Chunk',
    },
  },
  insert_gt_schema: {
    projectId: 17,
    namespace: 'InsERTGTSchema',
    jobPrefix: 'IGTS',
    exportDir: 'exports/insert_gt_schema/v1',
    uploadManifest: 'upload_insert_gt_schema_manifest.json',
    buildManifest: 'build_insert_gt_schema_jobs_manifest.json',
    readmeTitle: 'InsERTGTSchema',
    includeShortNames: true,
    listLimit: 200,
    reuseActive: false,
    fileEntityMap: {
      'database_instance.csv': 'DatabaseInstance',
      'table.csv': 'Table',
      'column.csv': 'Column',
      'primary_key.csv': 'PrimaryKey',
      'foreign_key.csv': 'ForeignKey',
      'index.csv': 'Index',
      'constraint.csv': 'Constraint',
      'view.csv': 'View',
      'stored_procedure.csv': 'StoredProcedure',
      'function.csv': 'Function',
      'trigger.csv': 'Trigger',
      'parameter.csv': 'Parameter',
      'object_dependency.csv': 'ObjectDependency',
      'table_query_guide.csv': 'TableQueryGuide',
      'join_path_guide.csv': 'JoinPathGuide',
      'sql_object_guide.csv': 'SqlObjectGuide',
      'reference_document.csv': 'ReferenceDocument',
      'chunk.csv': 'Chunk',
    },
  },
};

function parseArgs(args) {
  const profileIndex = args.indexOf('--profile');
  const kbIndex = args.indexOf('--kb');
  const namespaceIndex = args.indexOf('--namespace');
  return {
    profile: profileIndex >= 0 ? String(args[profileIndex + 1] || '').trim() : '',
    kb: kbIndex >= 0 ? String(args[kbIndex + 1] || '').trim() : '',
    namespace: namespaceIndex >= 0 ? String(args[namespaceIndex + 1] || '').trim() : '',
  };
}

function taxbellProjectIdForNamespace(namespace) {
  if (process.env.OPENSPG_PROJECT_ID) return Number(process.env.OPENSPG_PROJECT_ID);
  const map = loadJsonIfExists(TAXBELL_PROJECT_MAP_PATH, { entries: [] });
  const entry = (map.entries || []).find((item) => item.namespace === namespace);
  return Number(entry?.projectId || 0);
}

function resolveConfig() {
  const args = parseArgs(process.argv.slice(2));
  const profileName = args.profile || process.env.OPENSPG_BUILD_PROFILE || '';
  if (!profileName || !PROFILES[profileName]) {
    throw new Error(`Unknown or missing OPENSPG_BUILD_PROFILE/--profile: ${profileName || '<empty>'}`);
  }
  const profile = PROFILES[profileName];
  if (profileName === 'taxbell_reference') {
    const namespace = args.namespace || args.kb || process.env.OPENSPG_NAMESPACE || '';
    if (!namespace) throw new Error('Taxbell profile requires OPENSPG_NAMESPACE, --namespace or --kb');
    const taxbell = taxbellConfig(namespace);
    const projectId = taxbellProjectIdForNamespace(namespace);
    if (!projectId) throw new Error(`No OpenSPG projectId for ${namespace}; run create_taxbell_reference_projects.mjs first`);
    const jobPrefix = process.env.OPENSPG_JOB_PREFIX || taxbell.jobPrefix;
    const exportDir = path.join(ROOT, process.env.OPENSPG_EXPORT_DIR || taxbell.exportDir);
    return {
      profileName,
      namespace,
      projectId,
      jobPrefix,
      exportDir,
      exportManifestPath: path.join(exportDir, '_manifest.json'),
      uploadManifestPath: path.join(exportDir, taxbell.uploadManifest),
      buildManifestPath: path.join(exportDir, taxbell.buildManifest),
      readmePath: '',
      readmeTitle: '',
      includeShortNames: profile.includeShortNames,
      listLimit: profile.listLimit,
      reuseActive: profile.reuseActive,
      activeJobMaxAgeMinutes: profile.activeJobMaxAgeMinutes ?? null,
      fileEntityMap: profile.fileEntityMap,
    };
  }
  const namespace = process.env.OPENSPG_NAMESPACE || profile.namespace;
  const projectId = Number(process.env.OPENSPG_PROJECT_ID || profile.projectId);
  const jobPrefix = process.env.OPENSPG_JOB_PREFIX || profile.jobPrefix;
  const exportDir = path.join(ROOT, process.env.OPENSPG_EXPORT_DIR || profile.exportDir);
  const uploadManifestPath = path.join(exportDir, profile.uploadManifest);
  const buildManifestPath = path.join(exportDir, profile.buildManifest);
  const readmePath = profile.readmeTitle ? path.join(exportDir, 'README.md') : '';
  return {
    profileName,
    namespace,
    projectId,
    jobPrefix,
    exportDir,
    exportManifestPath: path.join(exportDir, '_manifest.json'),
    uploadManifestPath,
    buildManifestPath,
    readmePath,
    readmeTitle: profile.readmeTitle || '',
    includeShortNames: profile.includeShortNames,
    listLimit: profile.listLimit,
    reuseActive: profile.reuseActive,
    activeJobMaxAgeMinutes: profile.activeJobMaxAgeMinutes ?? null,
    fileEntityMap: profile.fileEntityMap,
  };
}

export function parseJobTimestamp(job) {
  const raw = String(job?.gmtModified || job?.gmtCreate || '').trim();
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : 0;
}

export function isReusableActiveJob(job, expectedJobName, uploadedUrl, maxAgeMs) {
  if (!job || !ACTIVE_STATUSES.has(job.status)) return false;
  if (job.jobName !== expectedJobName) return false;
  if (uploadedUrl && job.fileUrl !== uploadedUrl) return false;
  const ageMs = Date.now() - parseJobTimestamp(job);
  return ageMs >= 0 && ageMs <= maxAgeMs;
}

export async function main() {
  const cfg = resolveConfig();
  if (!COOKIE) throw new Error('OPENSPG_COOKIE or OPENSPG_COOKIE_FILE is required');
  if (!cfg.projectId) throw new Error('OPENSPG_PROJECT_ID is required');

  const client = createBuildClient({ apiBase: API_BASE, cookie: COOKIE });
  const forceFiles = new Set(
    String(process.env.OPENSPG_FORCE_FILES || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
  );

  const exportManifest = JSON.parse(fs.readFileSync(cfg.exportManifestPath, 'utf8'));
  const uploadManifest = loadJsonIfExists(cfg.uploadManifestPath, {
    generatedAt: new Date().toISOString(),
    projectId: cfg.projectId,
    namespace: cfg.namespace,
    files: [],
  });
  const buildManifest = loadJsonIfExists(cfg.buildManifestPath, {
    generatedAt: new Date().toISOString(),
    projectId: cfg.projectId,
    namespace: cfg.namespace,
    jobs: [],
  });

  const schemaEntityIds = await client.getSchemaEntityIdMap(cfg.projectId, {
    includeShortNames: cfg.includeShortNames,
  });
  const existingJobs = await client.listBuilderJobs(cfg.projectId, { limit: cfg.listLimit });

  for (const file of exportManifest.files || []) {
    const entityTypeName = cfg.fileEntityMap[file.fileName];
    if (!entityTypeName) continue;
    if (Number(file.rowCount || 0) === 0) continue;

    const entityTypeId = schemaEntityIds.get(entityTypeName);
    if (!entityTypeId) {
      throw new Error(`Entity type ${entityTypeName} not found in schema graph for ${cfg.namespace}`);
    }

    let uploadEntry = uploadManifest.files.find((entry) => entry.fileName === file.fileName);
    if (!uploadEntry || forceFiles.has(file.fileName)) {
      const uploadedUrl = await client.uploadCsvFile(file.path || path.join(cfg.exportDir, file.fileName));
      uploadEntry = {
        fileName: file.fileName,
        rowCount: file.rowCount,
        columns: file.columns,
        uploadedUrl,
      };
      uploadManifest.files = uploadManifest.files.filter((entry) => entry.fileName !== file.fileName);
      uploadManifest.files.push(uploadEntry);
      writeJson(cfg.uploadManifestPath, uploadManifest);
    }

    const manifestJob = buildManifest.jobs.find((entry) => entry.fileName === file.fileName);
    if (manifestJob?.status === 'FINISH' && !forceFiles.has(file.fileName)) {
      if (cfg.readmePath) {
        refreshBuildReadme({
          title: cfg.readmeTitle,
          readmePath: cfg.readmePath,
          exportManifest,
          uploadManifest,
          buildManifest,
        });
      }
      continue;
    }

    const expectedJobName = `${cfg.jobPrefix} ${entityTypeName} CSV Import`;
    const activeJobMaxAgeMs = Number.isFinite(cfg.activeJobMaxAgeMinutes)
      ? Math.max(1, cfg.activeJobMaxAgeMinutes) * 60 * 1000
      : ACTIVE_JOB_MAX_AGE_MS;
    const activeJob = cfg.reuseActive
      ? existingJobs.find((job) => isReusableActiveJob(job, expectedJobName, uploadEntry.uploadedUrl, activeJobMaxAgeMs))
      : null;

    if (cfg.reuseActive) {
      const staleActiveJob = existingJobs.find((job) => job.jobName === expectedJobName && ACTIVE_STATUSES.has(job.status));
      if (staleActiveJob && staleActiveJob.id !== activeJob?.id) {
        const ageMinutes = Math.max(0, Math.round((Date.now() - parseJobTimestamp(staleActiveJob)) / 60000));
        process.stderr.write(
          `Skipping stale builder job ${staleActiveJob.id} (${staleActiveJob.status}) for ${file.fileName}; ` +
          `age=${ageMinutes}m threshold=${Math.round(activeJobMaxAgeMs / 60000)}m fileUrl=${staleActiveJob.fileUrl || '<missing>'}\n`,
        );
      }
    }

    let finalJob;
    if (activeJob) {
      finalJob = await waitForBuilderJob({
        jobId: activeJob.id,
        pollIntervalMs: POLL_INTERVAL_MS,
        maxWaitMs: MAX_WAIT_MS,
        terminalStatuses: TERMINAL_STATUSES,
        fetchJob: async (id) => client.getBuilderJob(id),
      });
    } else {
      const payload = buildCsvUpsertPayload({
        projectId: cfg.projectId,
        createUser: process.env.OPENSPG_CREATE_USER || 'mcpadmin',
        jobName: expectedJobName,
        namespace: cfg.namespace,
        entityTypeName,
        entityTypeId,
        fileName: file.fileName,
        uploadedUrl: uploadEntry.uploadedUrl,
        columns: file.columns,
      });
      const submitted = await client.submitBuilderJob(payload);
      const jobId = typeof submitted === 'object' ? submitted.id : submitted;
      finalJob = await waitForBuilderJob({
        jobId,
        pollIntervalMs: POLL_INTERVAL_MS,
        maxWaitMs: MAX_WAIT_MS,
        terminalStatuses: TERMINAL_STATUSES,
        fetchJob: async (id) => client.getBuilderJob(id),
      });
    }

    buildManifest.jobs = buildManifest.jobs.filter((entry) => entry.fileName !== file.fileName);
    buildManifest.jobs.push({
      fileName: file.fileName,
      id: finalJob.id,
      status: finalJob.status,
      jobName: finalJob.jobName,
      entityType: `${cfg.namespace}.${entityTypeName}`,
      entityTypeId,
      rowCount: file.rowCount,
      uploadedUrl: uploadEntry.uploadedUrl,
      gmtCreate: finalJob.gmtCreate,
      gmtModified: finalJob.gmtModified,
      fileUrl: finalJob.fileUrl,
    });
    writeJson(cfg.buildManifestPath, buildManifest);

    if (cfg.readmePath) {
      refreshBuildReadme({
        title: cfg.readmeTitle,
        readmePath: cfg.readmePath,
        exportManifest,
        uploadManifest,
        buildManifest,
      });
    }

    if (finalJob.status !== 'FINISH') {
      throw new Error(`Builder job failed for ${file.fileName}: ${finalJob.status}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exit(1);
  });
}
