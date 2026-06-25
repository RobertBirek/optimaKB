#!/usr/bin/env node

import {
  listInboxDrafts,
  loadPromotedKnowledge,
  promoteDraft,
  rejectDraft,
  withdrawPromotedDraft,
  TARGET_KBS,
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

  throw new Error(`Unknown command: ${command}`);
} catch (error) {
  process.stderr.write(`${error.message}\n\n${usage()}\n`);
  process.exit(1);
}
