// Scaffolding shared by the CLI (scripts/new.mjs) and the dev editor (scripts/admin/).
// A blog is the atomic unit; it stands alone in content/blogs/ or lives in a series.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CONTENT = process.env.CONTENT_DIR ? path.resolve(process.env.CONTENT_DIR) : path.join(ROOT, 'content');
export const RESERVED = ['blogs', 'series'];
// Folder names become URL slugs.
export const FOLDER_RE = /^[a-z0-9][a-z0-9._-]*$/i;

const today = () => new Date().toISOString().slice(0, 10);
const yamlStr = (s) => JSON.stringify(s);

export function createSeries(folder, title = folder) {
  if (!folder) throw new Error('Usage: npm run new:series -- <series-folder> "Series Title"');
  if (!FOLDER_RE.test(folder)) throw new Error(`"${folder}" is not a valid folder name (letters, digits, - _ .)`);
  if (RESERVED.includes(folder)) throw new Error(`"${folder}" is reserved — pick another series folder name`);
  const dir = path.join(CONTENT, folder);
  if (fs.existsSync(dir)) throw new Error(`content/${folder} already exists`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.md'),
    `---
title: ${yamlStr(title)}
subtitle: "One-line description of this series"
thumbnail: thumbnail.png      # image inside this folder (optional)
order: 1                      # position on the home page
date: ${today()}
tags: []
draft: true                   # remove when ready to publish

# Blogs in reading order. Each folder holds index.md + assets/.
blogs: []
---

Intro paragraph shown on the series page (Markdown supported).
`
  );
  return { rel: folder, message: `Created content/${folder}/index.md` };
}

// `target` is "<blog-folder>" (standalone) or "<series>/<blog-folder>".
export function createBlog(target, title, section = null) {
  if (!target) throw new Error('Usage: npm run new:blog -- [<series>/]<blog-folder> "Blog Title"');
  const [series, folder] = target.includes('/') ? target.split('/') : [null, target];
  if (!FOLDER_RE.test(folder ?? '') || (series && !FOLDER_RE.test(series))) throw new Error(`"${target}" is not a valid folder name (letters, digits, - _ .)`);
  const seriesIndex = series && path.join(CONTENT, series, 'index.md');
  if (series && !fs.existsSync(seriesIndex)) throw new Error(`content/${series}/index.md not found — create the series first`);
  if (!series && section) throw new Error('--section only applies to a blog inside a series');
  const rel = series ? `${series}/${folder}` : `blogs/${folder}`;
  const dir = path.join(CONTENT, rel);
  if (fs.existsSync(dir)) throw new Error(`content/${rel} already exists`);

  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'index.md'),
    `---
title: ${yamlStr(title ?? folder)}
subtitle: "What the reader will learn"
date: ${today()}
thumbnail: assets/cover.png   # optional
tags: []
draft: true                   # remove when ready to publish
references: []
---

Write your blog here. Put images in \`assets/\` and reference them relatively:

![Diagram](assets/diagram.png)
`
  );

  if (!series) return { rel, message: `Created content/${rel}/ — it will appear at /blogs/${folder}/` };

  // Register the blog in the series index.md by editing lines in place
  // (keeps your comments and formatting intact).
  const result = addToSeriesIndex(fs.readFileSync(seriesIndex, 'utf8'), folder, section);
  if (result.text) fs.writeFileSync(seriesIndex, result.text);
  return { rel, message: `Created content/${rel}/ — ${result.text ? `${result.message} in content/${series}/index.md` : result.message}` };
}

export function addToSeriesIndex(src, folder, section) {
  const lines = src.split('\n');
  const fmEnd = lines.indexOf('---', 1);
  if (lines[0] !== '---' || fmEnd < 0) return { message: 'could not find front matter in the series index.md' };

  const indent = (l) => l.match(/^ */)[0].length;
  const pad = (n) => ' '.repeat(n);
  const isItem = (l) => /^\s*- folder:/.test(l);
  const unquote = (v) => {
    v = v.trim();
    try {
      if (v.startsWith('"')) return JSON.parse(v).trim();
    } catch {}
    return v.replace(/^(["'])(.*)\1$/, '$2').trim();
  };
  const insert = (at, newLines) => lines.splice(at, 0, ...newLines);
  const done = (message) => ({ text: lines.join('\n'), message });

  // Index just past a list item and its nested keys (e.g. subtitle:).
  const itemEnd = (i) => {
    const d = indent(lines[i]);
    let j = i + 1;
    while (j < fmEnd && lines[j].trim() && indent(lines[j]) > d) j++;
    return j;
  };

  // Add the item to the list inside [from, to): after its last item, or into an empty `blogs:`.
  const addInRange = (from, to) => {
    let last = -1;
    for (let i = from; i < to; i++) if (isItem(lines[i])) last = i;
    if (last >= 0) {
      insert(itemEnd(last), [`${pad(indent(lines[last]))}- folder: ${folder}`]);
      return true;
    }
    for (let i = from; i < to; i++) {
      const m = lines[i].match(/^(\s*)blogs:\s*(\[\s*\])?\s*(#.*)?$/);
      if (m) {
        lines[i] = `${m[1]}blogs:`;
        insert(i + 1, [`${m[1]}  - folder: ${folder}`]);
        return true;
      }
    }
    return false;
  };

  if (!section) {
    return addInRange(1, fmEnd)
      ? done('added it to the end of the list')
      : { message: `add "- folder: ${folder}" under blogs: in the series index.md` };
  }

  // Existing section with this title?
  for (let i = 1; i < fmEnd; i++) {
    const m = lines[i].match(/^(\s*)- title:\s*(.+?)\s*$/);
    if (!m || unquote(m[2]) !== section) continue;
    let end = i + 1;
    while (end < fmEnd && (!lines[end].trim() || indent(lines[end]) > indent(lines[i]))) end++;
    if (addInRange(i, end)) return done(`added it to section "${section}"`);
    insert(i + 1, [`${m[1]}  blogs:`, `${m[1]}    - folder: ${folder}`]);
    return done(`added it to section "${section}"`);
  }

  // New section at the end of `sections:` (created if missing).
  const block = [`  - title: ${JSON.stringify(section)}`, '    blogs:', `      - folder: ${folder}`];
  const secLine = lines.findIndex((l, i) => i < fmEnd && /^sections:/.test(l));
  if (secLine < 0) {
    insert(fmEnd, ['sections:', ...block]);
  } else {
    lines[secLine] = 'sections:';
    let lastChild = secLine;
    for (let i = secLine + 1; i < fmEnd && (!lines[i].trim() || indent(lines[i]) > 0); i++) if (lines[i].trim()) lastChild = i;
    insert(lastChild + 1, block);
  }
  return done(`created section "${section}" with it`);
}
