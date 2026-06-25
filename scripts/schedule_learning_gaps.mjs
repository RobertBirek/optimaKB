#!/usr/bin/env node

import process from 'process';

const CRONTAB_LINE = '0 6 * * * cd /docker/openspg && /usr/bin/node scripts/process_learning_gaps.mjs --limit 20 >> logs/learning_cron.log 2>&1';

function usage() {
  return [
    'Usage:',
    '  node scripts/schedule_learning_gaps.mjs',
    '  node scripts/schedule_learning_gaps.mjs --install',
    '  node scripts/schedule_learning_gaps.mjs --uninstall',
    '  node scripts/schedule_learning_gaps.mjs --run',
    '',
    'Options:',
    '  --install    Add daily cron job (06:00) to process open gaps',
    '  --uninstall  Remove daily cron job',
    '  --run        Run gap processing immediately',
    '  (default)    Show current cron status',
    '',
  ].join('\n');
}

function hasArg(args, name) {
  return args.includes(name);
}

async function main() {
  const args = process.argv.slice(2);

  if (hasArg(args, '--help')) {
    process.stdout.write(usage());
    return;
  }

  if (hasArg(args, '--run')) {
    process.stdout.write('Running learning gaps processor...\n');
    await import('./process_learning_gaps.mjs');
    process.exit(0);
  }

  if (hasArg(args, '--install')) {
    const { execSync } = await import('child_process');
    const current = execSync('crontab -l 2>/dev/null || true', { encoding: 'utf8' });
    if (current.includes('process_learning_gaps.mjs')) {
      process.stdout.write('Cron job already installed. Skipping.\n');
      return;
    }
    const newCron = `${current.trim()}\n${CRONTAB_LINE}\n`;
    execSync(`echo ${JSON.stringify(newCron)} | crontab -`);
    process.stdout.write('Cron job installed: daily 06:00\n');
    return;
  }

  if (hasArg(args, '--uninstall')) {
    const { execSync } = await import('child_process');
    const current = execSync('crontab -l 2>/dev/null || true', { encoding: 'utf8' });
    const lines = current.split('\n').filter((line) => !line.includes('process_learning_gaps.mjs'));
    execSync(`echo ${JSON.stringify(lines.join('\n') + '\n')} | crontab -`);
    process.stdout.write('Cron job removed.\n');
    return;
  }

  const { execSync } = await import('child_process');
  const current = execSync('crontab -l 2>/dev/null || echo "No crontab"', { encoding: 'utf8' });
  const installed = current.includes('process_learning_gaps.mjs');
  process.stdout.write(
    `Learning gaps cron: ${installed ? 'INSTALLED' : 'NOT INSTALLED'}\n${installed ? '' : `Install: node ${process.argv[1]} --install\n`}`,
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
