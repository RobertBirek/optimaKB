#!/usr/bin/env node

import path from 'path';
import { spawnSync } from 'child_process';

const ROOT = '/docker/openspg';

function runNodeScript(scriptName, extraEnv = {}) {
  const scriptPath = path.join(ROOT, 'scripts', scriptName);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    const detail = [
      result.error ? String(result.error.message || result.error) : '',
      result.stdout,
      result.stderr,
      result.signal ? `signal=${result.signal}` : '',
      result.status !== null ? `exit=${result.status}` : '',
    ].filter(Boolean).join('\n').trim();
    throw new Error(`${scriptName} failed${detail ? `\n${detail}` : ''}`);
  }
  return result.stdout.trim();
}

function main() {
  const maxPosts = String(process.env.COMMUNITY_NEWS_MAX_POSTS || '200');
  const force = String(process.env.COMMUNITY_NEWS_FORCE || '1');
  const buildEnabled = String(process.env.OPENSPG_BUILD || '1') !== '0';

  const downloadOutput = runNodeScript('download_comarch_community_news.mjs', {
    COMMUNITY_NEWS_MAX_POSTS: maxPosts,
    COMMUNITY_NEWS_FORCE: force,
  });
  const exportOutput = runNodeScript('export_comarch_community_news.mjs');

  let buildOutput = '';
  if (buildEnabled) {
    buildOutput = runNodeScript('build_comarch_community_news.mjs', {
      OPENSPG_PROJECT_ID: process.env.OPENSPG_PROJECT_ID || '11',
      OPENSPG_FORCE_FILES:
        process.env.OPENSPG_FORCE_FILES ||
        'reference_document.csv,news_topic.csv,community_attachment.csv,chunk.csv',
    });
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        steps: {
          download: downloadOutput ? JSON.parse(downloadOutput) : null,
          export: exportOutput ? JSON.parse(exportOutput) : null,
          build: buildOutput ? JSON.parse(buildOutput) : null,
        },
      },
      null,
      2,
    )}\n`,
  );
}

main();
