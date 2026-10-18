// Dev-only content editor, mounted by scripts/dev.mjs at /__admin/. Never imported by the build,
// so nothing here ships to GitHub Pages. It reads and writes files under content/ directly; the
// dev server's watcher then rebuilds the site as usual.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { ROOT_TOKEN, normalizeReferences, renderMarkdown } from '../build.mjs';
import { CONTENT, FOLDER_RE, RESERVED, createBlog, createSeries } from '../content.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const PREFIX = '/__admin';
const MAX_BODY = 50 * 1024 * 1024;
const WORDS_PER_MINUTE = 200;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.avif': 'image/avif', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webm': 'video/webm',
  '.md': 'text/plain; charset=utf-8', '.txt': 'text/plain; charset=utf-8',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Returns true when the request was for the editor (handled here), false to let dev.mjs serve it.
export async function handleAdmin(req, res, urlPath) {
  if (urlPath !== PREFIX && !urlPath.startsWith(`${PREFIX}/`)) return false;

  // The editor writes files, so only answer this machine — not other devices on the network, and
  // not other websites (DNS rebinding / cross-site requests).
  if (!isLoopback(req)) {
    res.writeHead(403).end('The editor is only available from this machine.');
    return true;
  }
  if (urlPath === PREFIX) {
    res.writeHead(301, { Location: `${PREFIX}/` }).end();
    return true;
  }

  try {
    const sub = urlPath.slice(PREFIX.length);
    if (sub.startsWith('/api/')) await api(req, res, sub.slice(5));
    else if (sub.startsWith('/content/')) serveFile(res, CONTENT, sub.slice(9));
    else if (sub === '/rich/editor.js' || sub === '/rich/editor.css') await serveRichEditor(res, path.extname(sub));
    else serveFile(res, path.join(HERE, 'ui'), sub === '/' ? 'index.html' : sub.slice(1));
  } catch (e) {
    const status = e.status ?? 500;
    if (status === 500) console.error(e);
    json(res, status, { error: friendlyError(e) });
  }
  return true;
}

// File system errors, in words that say what to do about them.
function friendlyError(e) {
  const inContent = e.path && path.resolve(e.path).startsWith(CONTENT + path.sep);
  const file = !e.path ? 'the file' : inContent ? path.join('content', path.relative(CONTENT, e.path)) : path.basename(e.path);
  switch (e.code) {
    case 'EACCES':
    case 'EPERM':
      return `No permission to write ${file} — is it read-only or open in another program?`;
    case 'ENOSPC':
      return 'The disk is full';
    case 'ENOENT':
      return `${file} doesn't exist any more — was it moved or deleted?`;
    case 'EROFS':
      return `${file} is on a read-only drive`;
    case 'EBUSY':
      return `${file} is locked by another program`;
    default:
      return e.message;
  }
}

// The visual editor is bundled from npm packages (devDependencies) the first time it's asked for.
let richBundle = null;
let richBuiltFrom = 0;
async function serveRichEditor(res, ext) {
  const mtime = fs.statSync(path.join(HERE, 'rich', 'entry.js')).mtimeMs;
  if (mtime !== richBuiltFrom) richBundle = null;
  richBuiltFrom = mtime;
  richBundle ??= bundleRichEditor().catch((e) => {
    richBundle = null;
    throw e;
  });
  const files = await richBundle;
  res.writeHead(200, { 'Content-Type': MIME[ext], 'Cache-Control': 'no-cache' });
  res.end(files[ext]);
}

async function bundleRichEditor() {
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    throw new HttpError(503, 'The visual editor needs its dev dependencies — run npm install');
  }
  const started = Date.now();
  const result = await esbuild.build({
    entryPoints: { editor: path.join(HERE, 'rich', 'entry.js') },
    absWorkingDir: ROOT,
    bundle: true,
    format: 'esm',
    minify: true,
    write: false,
    outdir: path.join(HERE, 'rich', 'out'),
    loader: { '.woff': 'dataurl', '.woff2': 'dataurl', '.ttf': 'dataurl', '.svg': 'dataurl', '.png': 'dataurl' },
    logLevel: 'silent',
  });
  const files = Object.fromEntries(result.outputFiles.map((f) => [path.extname(f.path), f.text]));
  console.log(`  ✓ Bundled the visual editor in ${Date.now() - started}ms`);
  return files;
}

// Start bundling right away so the editor opens fast.
export function warmRichEditor() {
  richBundle ??= bundleRichEditor().catch(() => (richBundle = null));
}

function isLoopback(req) {
  const addr = req.socket.remoteAddress ?? '';
  const host = req.headers.host ?? '';
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(addr) && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
}

// ---------------------------------------------------------------------------
// API

async function api(req, res, route) {
  const url = new URL(req.url, 'http://x');
  const q = (k) => url.searchParams.get(k) ?? '';
  const method = req.method;

  // A custom header can't be sent cross-origin without a CORS preflight, which we never approve.
  if (method !== 'GET' && req.headers['x-admin'] !== '1') throw new HttpError(403, 'Missing X-Admin header');

  if (route === 'tree' && method === 'GET') return json(res, 200, tree());

  if (route === 'blog' && method === 'GET') return json(res, 200, readBlog(q('path')));
  if (route === 'blog' && method === 'PUT') {
    const rel = blogRel(q('path'));
    const { data, body } = await readJson(req);
    writeDoc(path.join(CONTENT, rel, 'index.md'), data, body);
    return json(res, 200, { ok: true });
  }
  if (route === 'blog' && method === 'POST') {
    const { series, folder, title, section } = await readJson(req);
    return json(res, 200, scaffold(createBlog, series ? `${series}/${folder}` : folder, title, section || null));
  }

  if (route === 'series' && method === 'GET') return json(res, 200, readSeries(q('slug')));
  if (route === 'series' && method === 'PUT') {
    const slug = seriesSlug(q('slug'));
    writeSeries(slug, await readJson(req));
    return json(res, 200, { ok: true });
  }
  if (route === 'series' && method === 'POST') {
    const { folder, title } = await readJson(req);
    return json(res, 200, scaffold(createSeries, folder, title));
  }

  if (route === 'preview' && method === 'POST') return json(res, 200, await preview(await readJson(req)));

  if (route === 'assets' && method === 'GET') return json(res, 200, listAssets(q('path')));
  if (route === 'upload' && method === 'POST') {
    const rel = contentRel(q('path'));
    const buf = await readBody(req);
    return json(res, 200, upload(rel, q('name'), buf));
  }

  throw new HttpError(404, `Unknown API route: ${method} ${route}`);
}

function tree() {
  const series = [];
  const dirs = fs.existsSync(CONTENT) ? fs.readdirSync(CONTENT, { withFileTypes: true }) : [];
  for (const entry of dirs) {
    if (!entry.isDirectory() || /^[._]/.test(entry.name) || RESERVED.includes(entry.name)) continue;
    if (!fs.existsSync(path.join(CONTENT, entry.name, 'index.md'))) continue;
    const s = readSeries(entry.name);
    series.push({
      slug: s.slug,
      title: s.data.title || s.slug,
      draft: !!s.data.draft,
      order: s.data.order ?? Number.MAX_SAFE_INTEGER,
      groups: s.groups.map((g) => ({ title: g.title, blogs: g.blogs.map((b) => ({ folder: b.folder, ...s.info[b.folder] })) })),
      unlisted: s.unlisted.map((folder) => ({ folder, ...s.info[folder] })),
    });
  }
  series.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));

  const blogsDir = path.join(CONTENT, 'blogs');
  const blogs = (fs.existsSync(blogsDir) ? fs.readdirSync(blogsDir, { withFileTypes: true }) : [])
    .filter((e) => e.isDirectory() && !/^[._]/.test(e.name) && fs.existsSync(path.join(blogsDir, e.name, 'index.md')))
    .map((e) => ({ folder: e.name, ...blogInfo(path.join(blogsDir, e.name)) }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || a.title.localeCompare(b.title));

  return { series, blogs };
}

function blogInfo(dir) {
  const file = path.join(dir, 'index.md');
  if (!fs.existsSync(file)) return { title: path.basename(dir), missing: true };
  const { data } = parse(fs.readFileSync(file, 'utf8'));
  return { title: data.title || path.basename(dir), draft: !!data.draft, date: data.date || '' };
}

function readBlog(relIn) {
  const rel = blogRel(relIn);
  const file = path.join(CONTENT, rel, 'index.md');
  if (!fs.existsSync(file)) throw new HttpError(404, `content/${rel}/index.md not found`);
  const { data, content } = parse(fs.readFileSync(file, 'utf8'));
  const [series] = rel.split('/');
  const seriesTitle = series === 'blogs' ? null : readSeries(series).data.title || series;
  return { rel, data, body: content, series: series === 'blogs' ? null : { slug: series, title: seriesTitle } };
}

function readSeries(slugIn) {
  const slug = seriesSlug(slugIn);
  const dir = path.join(CONTENT, slug);
  const file = path.join(dir, 'index.md');
  if (!fs.existsSync(file)) throw new HttpError(404, `content/${slug}/index.md not found`);
  const { data, content } = parse(fs.readFileSync(file, 'utf8'));

  // Same grouping rules as the build: a top-level `blogs:` is an untitled first group.
  const ref = (item) => (typeof item === 'string' ? { folder: item } : { ...item });
  const groups = [{ title: null, description: '', blogs: Array.isArray(data.blogs) ? data.blogs.map(ref) : [] }];
  if (Array.isArray(data.sections)) {
    for (const sec of data.sections) {
      const { blogs, title, description, ...rest } = sec ?? {};
      groups.push({ ...rest, title: title ?? '', description: description ?? '', blogs: Array.isArray(blogs) ? blogs.map(ref) : [] });
    }
  }
  const { blogs: _b, sections: _s, ...meta } = data;

  const listed = new Set(groups.flatMap((g) => g.blogs.map((b) => b.folder)));
  const folders = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'index.md')))
    .map((e) => e.name);
  const unlisted = folders.filter((f) => !listed.has(f)).sort();
  const info = Object.fromEntries([...listed, ...unlisted].map((f) => [f, blogInfo(path.join(dir, f))]));

  return { slug, data: meta, groups, unlisted, info, body: content };
}

function writeSeries(slug, { data, groups, body }) {
  const out = { ...data };
  const [loose, ...sections] = groups;
  const refs = (blogs) => blogs.map(({ folder, ...rest }) => ({ folder, ...rest }));
  if (loose?.blogs.length || !sections.length) out.blogs = refs(loose?.blogs ?? []);
  if (sections.length) {
    out.sections = sections.map(({ title, description, blogs, ...rest }) => ({
      title,
      ...(description ? { description } : {}),
      ...rest,
      blogs: refs(blogs),
    }));
  }
  writeDoc(path.join(CONTENT, slug, 'index.md'), out, body);
}

async function preview({ path: relIn, data = {}, body = '' }) {
  const rel = blogRel(relIn);
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
  const layout = await import(`${pathToFileURL(path.join(ROOT, 'theme', 'layout.mjs')).href}?t=${Date.now()}`);
  const warnings = [];
  const { html, toc, words } = renderMarkdown(body, { warn: (w) => warnings.push(w), where: `${rel}/index.md` });

  const thumb = data.thumbnail ? String(data.thumbnail) : '';
  const blog = {
    slug: path.basename(rel),
    title: data.title || path.basename(rel),
    subtitle: data.subtitle || data.description || '',
    date: data.date && !Number.isNaN(Date.parse(data.date)) ? new Date(data.date) : null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    draft: !!data.draft,
    thumbnail: !thumb ? null : /^[a-z]+:\/\//i.test(thumb) ? thumb : `${PREFIX}/content/${rel}/${thumb}`,
    references: normalizeReferences(data.references),
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    toc,
    html,
  };
  if (thumb && !/^[a-z]+:\/\//i.test(thumb) && !fs.existsSync(path.join(CONTENT, rel, thumb))) {
    warnings.push(`thumbnail "${thumb}" not found`);
    blog.thumbnail = null;
  }

  // Relative image/link URLs in the blog resolve against its content folder.
  const site = {
    ...config,
    basePath: ROOT_TOKEN,
    extraHead: `<base href="${PREFIX}/content/${encodeURI(rel)}/">`,
    hasBlogs: true,
    hasSeries: true,
    link: (p = '') => `${ROOT_TOKEN}/${p.replace(/^\//, '')}`,
    absolute: (p = '') => `${config.url}/${p.replace(/^\//, '')}`,
  };
  const page = layout.blogPage({ site, blog, prev: null, next: null }).replaceAll(`${ROOT_TOKEN}/`, '/');
  return { html: page, warnings };
}

function listAssets(relIn) {
  const rel = contentRel(relIn);
  const dir = path.join(CONTENT, rel);
  const out = [];
  const walk = (d, prefix) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name.startsWith('.')) continue;
      const p = prefix ? `${prefix}/${e.name}` : e.name;
      // A series folder holds its blogs; only list its own files.
      if (e.isDirectory()) {
        if (fs.existsSync(path.join(d, e.name, 'index.md'))) continue;
        walk(path.join(d, e.name), p);
      } else if (e.name !== 'index.md') {
        out.push(p);
      }
    }
  };
  walk(dir, '');
  return { files: out.sort() };
}

// Blogs keep files in assets/; a series only publishes files at its top level.
function upload(rel, nameIn, buf) {
  const isSeries = !rel.includes('/');
  const clean = path.basename(nameIn || 'file').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'file';
  const sub = isSeries ? '' : 'assets';
  const dir = path.join(CONTENT, rel, sub);
  fs.mkdirSync(dir, { recursive: true });
  const ext = path.extname(clean);
  const stem = clean.slice(0, clean.length - ext.length);
  let name = clean;
  for (let i = 1; fs.existsSync(path.join(dir, name)); i++) name = `${stem}-${i}${ext}`;
  fs.writeFileSync(path.join(dir, name), buf);
  return { path: sub ? `${sub}/${name}` : name };
}

// ---------------------------------------------------------------------------
// Front matter

// gray-matter caches by input string and hands back shared objects; copy before use. Dates become
// YYYY-MM-DD strings so the editor can show and round-trip them.
function parse(src) {
  const { data, content } = matter(src);
  return { data: plain(data), content };
}

function plain(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)]));
  return v;
}

// Unchanged top-level keys keep their original lines (quotes, comments and all), so a save
// only touches the fields that were edited.
function writeDoc(file, data, body = '') {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new HttpError(400, 'Front matter must be an object');
  const prev = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  const old = prev ? parse(prev).data : {};
  const { blocks, tail } = frontMatterBlocks(prev);

  let yaml = '';
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    const block = blocks.get(k);
    if (block && k in old && JSON.stringify(old[k]) === JSON.stringify(v)) yaml += block.lines.join('\n') + '\n';
    else yaml += (block?.lead.length ? block.lead.join('\n') + '\n' : '') + toYaml({ [k]: v });
  }
  if (tail.some((l) => l.trim())) yaml += tail.join('\n').replace(/\n+$/, '') + '\n';

  const text = `---\n${yaml}---\n${!body || body.startsWith('\n') ? body : `\n${body}`}`;
  fs.writeFileSync(file, text.endsWith('\n') ? text : `${text}\n`);
}

// Splits raw front matter into one block per top-level key. Comment and blank lines belong to
// the key that follows them (`lead`); any left at the end are the `tail`.
function frontMatterBlocks(src) {
  const lines = src.split('\n');
  const end = lines.indexOf('---', 1);
  const blocks = new Map();
  let pending = [];
  let cur = null;
  if (lines[0] !== '---' || end < 0) return { blocks, tail: [] };
  for (const line of lines.slice(1, end)) {
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:/);
    if (m) {
      cur = { lead: pending, lines: [...pending, line] };
      blocks.set(m[1], cur);
      pending = [];
    } else if (/^\s*(#.*)?$/.test(line)) pending.push(line);
    else if (cur) {
      cur.lines.push(...pending, line);
      pending = [];
    }
  }
  return { blocks, tail: pending };
}

// A small YAML writer for front matter: block style for objects and lists of objects, flow style
// (`[a, b]`) for lists of plain values, quotes only when a value needs them.
export function toYaml(obj, indent = '') {
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out += `${indent}${k}:${yamlValue(v, indent, k)}\n`;
  }
  return out;
}

function yamlValue(v, indent, key) {
  if (Array.isArray(v)) {
    if (!v.length) return ' []';
    if (v.every(isScalar)) return ` [${v.map((x) => yamlScalar(x, key, true)).join(', ')}]`;
    return `\n${v.map((item) => yamlItem(item, `${indent}  `)).join('\n')}`;
  }
  if (v && typeof v === 'object') {
    const body = toYaml(v, `${indent}  `);
    return body ? `\n${body.replace(/\n$/, '')}` : ' {}';
  }
  return ` ${yamlScalar(v, key)}`;
}

function yamlItem(item, indent) {
  if (isScalar(item)) return `${indent}- ${yamlScalar(item)}`;
  if (Array.isArray(item)) return `${indent}- ${JSON.stringify(item)}`;
  const body = toYaml(item, `${indent}  `).replace(/\n$/, '');
  return body ? `${indent}- ${body.slice(indent.length + 2)}` : `${indent}- {}`;
}

const isScalar = (v) => v === null || typeof v !== 'object';

function yamlScalar(v, key, inFlow = false) {
  if (v === null) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (key === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s && s === s.trim() && !/[\n\t]/.test(s) && readsBackAs(s, inFlow) ? s : JSON.stringify(s);
}

// Leave a string unquoted only if YAML reads it back as that same string
// (so "no", "1.0", "2026-01-01" or "a: b" get quotes; "01-intro" doesn't).
function readsBackAs(s, inFlow) {
  try {
    const { k } = matter(`---\nk: ${inFlow ? `[${s}]` : s}\n---\n`).data;
    return inFlow ? Array.isArray(k) && k.length === 1 && k[0] === s : k === s;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Paths and HTTP helpers

const seriesSlug = (s) => {
  if (!FOLDER_RE.test(s) || RESERVED.includes(s)) throw new HttpError(400, `Invalid series "${s}"`);
  return s;
};

// "<series>/<blog>" or "blogs/<blog>"
const blogRel = (rel) => {
  const parts = String(rel).split('/');
  if (parts.length !== 2 || !parts.every((p) => FOLDER_RE.test(p)) || parts[0] === 'series') throw new HttpError(400, `Invalid blog path "${rel}"`);
  return rel;
};

// A blog or a series folder.
const contentRel = (rel) => (String(rel).includes('/') ? blogRel(rel) : seriesSlug(rel));

function serveFile(res, base, rel) {
  const file = path.resolve(base, decodeURIComponent(rel).replace(/^\/+/, ''));
  if (file !== base && !file.startsWith(base + path.sep)) throw new HttpError(403, 'Forbidden');
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw new HttpError(404, 'Not found');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, 'Upload too large (50 MB max)'));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

async function readJson(req) {
  try {
    return JSON.parse((await readBody(req)).toString('utf8') || '{}');
  } catch (e) {
    throw e instanceof HttpError ? e : new HttpError(400, 'Invalid JSON body');
  }
}

// createSeries/createBlog throw plain errors for user mistakes; report them as 400s.
function scaffold(fn, ...args) {
  try {
    return fn(...args);
  } catch (e) {
    throw new HttpError(400, e.message);
  }
}
