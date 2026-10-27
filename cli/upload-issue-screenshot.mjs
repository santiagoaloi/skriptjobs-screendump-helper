#!/usr/bin/env node
/**
 * Upload a local screenshot/image to the Skriptjobs Vercel Blob store
 * (`skriptjobs-issue-screenshots`, ID: `store_Ne1nANlb7KMIKYtF`, region: `arn1`)
 * and print the public URL (and optional Markdown snippet).
 */

import { put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const envPath = '/home/box/.config/skriptjobs/blob.env';
if (!process.env.BLOB_READ_WRITE_TOKEN && existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)="?([^"]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const args = process.argv.slice(2);
const markdownFlag = args.includes('--markdown') || args.includes('-m');
const positional = args.filter((a) => !a.startsWith('-'));

if (positional.length === 0) {
  console.error(
    'Usage: node /workspace/scripts/upload-issue-screenshot.mjs <local-image-path> [blob-pathname] [--markdown]'
  );
  process.exit(1);
}

const token = process.env.BLOB_READ_WRITE_TOKEN;
if (!token) {
  console.error('Error: BLOB_READ_WRITE_TOKEN is not set.');
  process.exit(1);
}

const localPath = path.resolve(positional[0]);
const ext = path.extname(localPath).toLowerCase();
const baseName = path.basename(localPath);
const defaultBlobPath = `issues/${new Date().toISOString().slice(0, 10)}/${baseName}`;
const blobPathname = positional[1] || defaultBlobPath;

const mimeByExt = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
};
const contentType = mimeByExt[ext] || undefined;

const fileBuffer = await readFile(localPath);

const blob = await put(blobPathname, fileBuffer, {
  access: 'public',
  token,
  ...(contentType ? { contentType } : {}),
});

if (markdownFlag) {
  console.log(`![${baseName}](${blob.url})`);
} else {
  console.log(blob.url);
}
