#!/usr/bin/env node
/**
 * Package the Chrome Extension (`extension/`) and publish/update a GitHub Release
 * with Keep-a-Changelog release notes extracted from CHANGELOG.md.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const manifest = JSON.parse(
  readFileSync(path.join(rootDir, 'extension', 'manifest.json'), 'utf8')
);
const tag = process.argv[2] || `v${manifest.version}`;

const distDir = path.join(rootDir, 'dist');
mkdirSync(distDir, { recursive: true });

const versionedZip = path.join(distDir, `skriptjobs-screendump-helper-${tag}.zip`);
const latestZip = path.join(distDir, 'skriptjobs-screendump-helper-extension.zip');

execFileSync('zip', ['-rq', versionedZip, '.'], {
  cwd: path.join(rootDir, 'extension'),
  stdio: 'inherit',
});
copyFileSync(versionedZip, latestZip);

const changelog = readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8');
const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const re = new RegExp(`## \\[${escaped}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`);
const match = changelog.match(re);
const body = match ? match[1].trim() : changelog.trim();

const header = `## Skriptjobs Screendump Helper ${tag}

### 📦 Quick Download & Install
1. Download **\`skriptjobs-screendump-helper-${tag}.zip\`** (or \`skriptjobs-screendump-helper-extension.zip\`) from **Assets** below and unzip it.
2. Open \`chrome://extensions\` in Chrome and enable **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.

---

`;

const notesPath = path.join(distDir, 'RELEASE_NOTES.md');
writeFileSync(notesPath, header + body + '\n', 'utf8');

try {
  execFileSync('gh', ['release', 'view', tag], { cwd: rootDir, stdio: 'ignore' });
  execFileSync(
    'gh',
    ['release', 'upload', tag, versionedZip, latestZip, '--clobber'],
    { cwd: rootDir, stdio: 'inherit' }
  );
  execFileSync(
    'gh',
    [
      'release',
      'edit',
      tag,
      '--title',
      `Skriptjobs Screendump Helper ${tag}`,
      '--notes-file',
      notesPath,
      '--latest',
    ],
    { cwd: rootDir, stdio: 'inherit' }
  );
} catch {
  execFileSync(
    'gh',
    [
      'release',
      'create',
      tag,
      versionedZip,
      latestZip,
      '--target',
      'main',
      '--title',
      `Skriptjobs Screendump Helper ${tag}`,
      '--notes-file',
      notesPath,
      '--latest',
    ],
    { cwd: rootDir, stdio: 'inherit' }
  );
}

console.log(`Published release ${tag} successfully.`);
