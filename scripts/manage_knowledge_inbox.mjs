#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  listInboxDrafts,
  loadPromotedKnowledge,
  promoteDraft,
  rejectDraft,
  withdrawPromotedDraft,
  TARGET_KBS,
  recoverOwaPromotedContent,
} from './lib/promoted_knowledge.mjs';
import { findOptimaReferenceDuplicateSources } from './lib/optima_reference_duplicates.mjs';

function usage() {
  return [
    'Usage:',
    '  node scripts/manage_knowledge_inbox.mjs list [--status pending|promoted|rejected|all]',
    '  node scripts/manage_knowledge_inbox.mjs show <draftId>',
    '  node scripts/manage_knowledge_inbox.mjs promote <draftId> [--note "..."] [--by "..."] [--force]',
    '  node scripts/manage_knowledge_inbox.mjs reject <draftId> [--note "..."] [--by "..."]',
    '  node scripts/manage_knowledge_inbox.mjs withdraw <draftId> [--note "..."] [--by "..."]',
    '  node scripts/manage_knowledge_inbox.mjs duplicates [--kb ComarchOptimaReference]',
    '  node scripts/manage_knowledge_inbox.mjs promoted <kbNamespace>',
    '  node scripts/manage_knowledge_inbox.mjs recover-owa-content <exactDraftId> --manifest <path> --backup-dir <path> --operation-id <id> --by <actor> --note <note> [--dry-run]',
    '',
    'Allowed namespaces:',
    ...Object.keys(TARGET_KBS).map((namespace) => `  - ${namespace}`),
  ].join('\n');
}

function argValue(args, name, fallback = '') {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function hasArg(args, name) {
  return args.includes(name);
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

const argv = process.argv.slice(2);
const [command, ...args] = argv;
const positionals = args.filter((arg, index) => {
  if (arg.startsWith('--')) return false;
  const previous = args[index - 1];
  return !previous || !previous.startsWith('--');
});
const draftIdOrNamespace = positionals[0] || '';

try {
  if (!command || command === 'help' || command === '--help') {
    process.stdout.write(`${usage()}\n`);
    process.exit(0);
  }

  if (command === 'list') {
    const status = argValue(args, '--status', 'pending');
    const drafts = listInboxDrafts().filter((draft) => status === 'all' || draft.status === status);
    printJson({ ok: true, status, count: drafts.length, drafts });
    process.exit(0);
  }

  if (command === 'show') {
    if (!draftIdOrNamespace) throw new Error('show requires draftId');
    const draft = listInboxDrafts().find((item) => item.id === draftIdOrNamespace);
    if (!draft) throw new Error(`Draft not found: ${draftIdOrNamespace}`);
    printJson({ ok: true, draft });
    process.exit(0);
  }

  if (command === 'promote') {
    if (!draftIdOrNamespace) throw new Error('promote requires draftId');
    const result = promoteDraft(draftIdOrNamespace, {
      reviewNote: argValue(args, '--note', ''),
      promotedBy: argValue(args, '--by', ''),
      force: hasArg(args, '--force'),
    });
    printJson({
      ok: true,
      action: 'promote',
      draftId: draftIdOrNamespace,
      jsonPath: result.jsonPath,
      mdPath: result.mdPath,
      registryEntry: result.registryEntry,
    });
    process.exit(0);
  }

  if (command === 'reject') {
    if (!draftIdOrNamespace) throw new Error('reject requires draftId');
    const entry = rejectDraft(draftIdOrNamespace, {
      reviewNote: argValue(args, '--note', ''),
      rejectedBy: argValue(args, '--by', ''),
    });
    printJson({ ok: true, action: 'reject', draftId: draftIdOrNamespace, registryEntry: entry });
    process.exit(0);
  }

  if (command === 'withdraw') {
    if (!draftIdOrNamespace) throw new Error('withdraw requires draftId');
    const entry = withdrawPromotedDraft(draftIdOrNamespace, {
      reviewNote: argValue(args, '--note', ''),
      withdrawnBy: argValue(args, '--by', ''),
    });
    printJson({ ok: true, action: 'withdraw', draftId: draftIdOrNamespace, registryEntry: entry });
    process.exit(0);
  }

  if (command === 'duplicates') {
    const kbNamespace = argValue(args, '--kb', 'ComarchOptimaReference');
    if (kbNamespace !== 'ComarchOptimaReference') {
      throw new Error(`Unsupported kbNamespace for duplicate scan: ${kbNamespace}`);
    }
    const duplicates = findOptimaReferenceDuplicateSources();
    printJson({ ok: true, kbNamespace, count: duplicates.length, duplicates });
    process.exit(0);
  }

  if (command === 'promoted') {
    if (!draftIdOrNamespace) throw new Error('promoted requires kbNamespace');
    const drafts = loadPromotedKnowledge(draftIdOrNamespace);
    printJson({ ok: true, kbNamespace: draftIdOrNamespace, count: drafts.length, drafts });
    process.exit(0);
  }

  if (command === 'recover-owa-content') {
    // Strict parsing is local to this operation; existing commands retain their
    // established argument behavior. No force, batch wildcard or implicit ID.
    const required = ['--manifest', '--backup-dir', '--operation-id', '--by', '--note'];
    const flags = new Map();
    const exactId = args[0];
    if (!exactId || exactId.startsWith('-')) throw new Error('Exact draftId is required');
    for (let i = 1; i < args.length; i++) {
      const flag = args[i];
      if ((!required.includes(flag) && flag !== '--dry-run') || flags.has(flag)) throw new Error('Invalid recovery flag');
      if (flag === '--dry-run') flags.set(flag, true);
      else {
        const value = args[++i];
        if (value === undefined || !value.trim() || value.startsWith('--')) throw new Error('Missing recovery flag value');
        flags.set(flag, value);
      }
    }
    if (required.some((flag) => !flags.has(flag))) throw new Error('Missing required recovery flag');
    // Validate the manifest pathname before opening it. Content parsing errors
    // are never echoed: JSON parser diagnostics can contain the source body.
    const root = path.resolve(process.env.ROOT || '/docker/openspg');
    const manifestPath = path.resolve(flags.get('--manifest'));
    const relative = path.relative(root, manifestPath);
    if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('Manifest outside ROOT');
    let cursor = path.parse(manifestPath).root;
    for (const part of manifestPath.slice(cursor.length).split(path.sep)) {
      cursor = path.join(cursor, part);
      if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error('Symlink manifest path');
    }
    const stat = fs.statSync(manifestPath);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('Invalid manifest file');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const result = await recoverOwaPromotedContent(exactId, {
      manifest, backupDir: flags.get('--backup-dir'), operationId: flags.get('--operation-id'),
      actor: flags.get('--by'), note: flags.get('--note'), dryRun: flags.has('--dry-run'),
    });
    // Only bounded identity/hash metadata; never serialize the recovered body.
    const { status, draftId, operationId, eventId, beforeHashes, afterHashes, currentHashes, contentSha256, wouldChange, previewOnly, auditCheckpoint } = result;
    printJson({ ok: true, action: 'recover_owa_content', status, draftId, operationId, eventId, beforeHashes, afterHashes, currentHashes, contentSha256, wouldChange, previewOnly, auditCheckpoint });
    process.exit(0);
  }

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  if (command === 'recover-owa-content') {
    const code = /^[A-Z_]{1,80}$/.test(error.code || '') ? error.code : 'OWA_RECOVERY_REFUSED';
    process.stderr.write(`OWA content recovery failed: ${code}\n`);
    process.exit(1);
  }
  process.stderr.write(`${error.message}\n\n${usage()}\n`);
  process.exit(1);
}
