// Static site builder -> dist/
// A blog is the atomic unit: a folder with index.md (+ assets). It either stands alone in
// content/blogs/<blog>/ or lives inside a series: content/<series>/<blog>/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import matter from 'gray-matter';
import { Marked } from 'marked';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = process.env.CONTENT_DIR ? path.resolve(process.env.CONTENT_DIR) : path.join(ROOT, 'content');
const THEME = path.join(ROOT, 'theme');
const DIST = process.env.OUT_DIR ? path.resolve(process.env.OUT_DIR) : path.join(ROOT, 'dist');

const WORDS_PER_MINUTE = 200;
// Templates build internal URLs on this placeholder; write() turns it into a relative
// prefix ("../../") per page so the site works from any host or folder.
const ROOT_TOKEN = '/__site_root__';
// Standalone blogs live in content/blogs/ and publish at /blogs/<slug>/.
const BLOGS_DIR = 'blogs';
// The all-series index lives at /series/, so no series folder may use that name.
const SERIES_INDEX = 'series';

export async function build({ basePath, includeDrafts = false, extraHead = '' } = {}) {
  const started = Date.now();
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
  config.url = (process.env.SITE_URL || config.url || '').replace(/\/$/, '');
  // Only the 404 page needs the real base path: it's served at arbitrary URLs.
  notFoundBase = normalizeBase(basePath ?? process.env.BASE_PATH ?? urlPath(config.url));
  config.basePath = ROOT_TOKEN;

  // Bust the import cache so `npm run dev` picks up template edits.
  const layout = await import(`${pathToFileURL(path.join(THEME, 'layout.mjs')).href}?t=${Date.now()}`);
  const warnings = [];
  const warn = (msg) => warnings.push(msg);

  const seriesList = loadSeries({ includeDrafts, warn });
  const blogs = loadStandaloneBlogs({ includeDrafts, warn });

  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  const site = {
    ...config,
    extraHead,
    hasBlogs: blogs.blogs.length > 0,
    hasSeries: seriesList.length > 0,
    link: (p = '') => `${config.basePath}/${p.replace(/^\//, '')}`,
    absolute: (p = '') => `${config.url}/${p.replace(/^\//, '')}`,
  };

  // Theme static assets
  copyDir(path.join(THEME, 'assets'), path.join(DIST, 'assets'));

  // Pages
  write('index.html', layout.homePage({ site, seriesList, blogs }));
  write('404.html', layout.notFoundPage({ site }));
  if (seriesList.length) write(`${SERIES_INDEX}/index.html`, layout.seriesIndexPage({ site, seriesList }));

  for (const series of seriesList) {
    copyAssets(series.dir, path.join(DIST, series.slug), { skipDirs: true });
    // The series page opens on its first blog. Its HTML is rebased because it's rendered one folder up.
    const first = series.blogs[0];
    const landing = first
      ? {
          ...first,
          html: rebaseHtml(first.html, `${first.slug}/`),
          references: first.references.map((r) => ({ ...r, url: rebaseUrl(r.url, `${first.slug}/`) })),
        }
      : null;
    write(`${series.slug}/index.html`, layout.seriesPage({ site, series, blog: landing, next: series.blogs[1] ?? null }));

    series.blogs.forEach((blog, i) => {
      copyAssets(blog.dir, path.join(DIST, series.slug, blog.slug));
      const prev = series.blogs[i - 1] ?? null;
      const next = series.blogs[i + 1] ?? null;
      write(`${series.slug}/${blog.slug}/index.html`, layout.blogPage({ site, series, blog, prev, next }));
    });
  }

  if (blogs.blogs.length) {
    write(`${BLOGS_DIR}/index.html`, layout.blogsIndexPage({ site, blogs }));
    blogs.blogs.forEach((blog, i) => {
      copyAssets(blog.dir, path.join(DIST, BLOGS_DIR, blog.slug));
      // Standalone blogs are sorted newest first: "previous" is the older one.
      const prev = blogs.blogs[i + 1] ?? null;
      const next = blogs.blogs[i - 1] ?? null;
      write(`${BLOGS_DIR}/${blog.slug}/index.html`, layout.blogPage({ site, blog, prev, next }));
    });
  }

  write('search.json', JSON.stringify(searchIndex(seriesList, blogs)));
  write('feed.xml', rssFeed(site, [...seriesList, blogs]));
  write('sitemap.xml', sitemap(site, [...seriesList, blogs]));
  write('.nojekyll', '');

  const blogCount = seriesList.reduce((n, s) => n + s.blogs.length, blogs.blogs.length);
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  console.log(`✓ Built ${blogCount} blog${blogCount === 1 ? '' : 's'} (${blogs.blogs.length} standalone, ${seriesList.length} series) in ${Date.now() - started}ms → ${path.relative(process.cwd(), DIST) || '.'}/`);
  return { warnings };
}

// ---------------------------------------------------------------------------
// Content loading

function loadSeries({ includeDrafts, warn }) {
  if (!fs.existsSync(CONTENT)) return [];
  const series = [];

  for (const entry of fs.readdirSync(CONTENT, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    if (entry.name === BLOGS_DIR) continue;
    if (entry.name === SERIES_INDEX) {
      warn(`content/${SERIES_INDEX}/ is reserved for the all-series page — rename that folder`);
      continue;
    }
    const dir = path.join(CONTENT, entry.name);
    const indexFile = path.join(dir, 'index.md');
    if (!fs.existsSync(indexFile)) {
      warn(`content/${entry.name}/ has no index.md — skipped`);
      continue;
    }

    const { data, content } = matter.read(indexFile);
    if (data.draft && !includeDrafts) continue;

    const slug = entry.name;
    const s = {
      slug,
      dir,
      title: data.title ?? titleCase(slug),
      subtitle: data.subtitle ?? '',
      order: data.order ?? Number.MAX_SAFE_INTEGER,
      tags: data.tags ?? [],
      date: data.date ? new Date(data.date) : null,
      draft: !!data.draft,
      thumbnail: assetUrl(slug, checkFile(dir, data.thumbnail, `${slug}/index.md`, warn)),
      html: '',
      blogs: [],
    };
    s.html = renderMarkdown(content, { warn, where: `${slug}/index.md` }).html;

    // Blogs are listed either flat (`blogs:`) or grouped (`sections:` → `blogs:`).
    // A top-level `blogs:` alongside `sections:` becomes an untitled first section.
    const groups = [];
    if (Array.isArray(data.blogs)) groups.push({ title: null, blogs: data.blogs });
    if (Array.isArray(data.sections)) {
      data.sections.forEach((sec, i) => {
        if (!sec || !Array.isArray(sec.blogs)) {
          warn(`${slug}/index.md: section ${i + 1} ("${sec?.title ?? ''}") has no "blogs:" list`);
          return;
        }
        groups.push({ title: sec.title ?? `Section ${i + 1}`, description: sec.description ?? '', blogs: sec.blogs });
      });
    }
    if (!groups.some((g) => g.blogs.length)) warn(`${slug}/index.md has no "blogs:" or "sections:" list — series has no blogs`);

    const seen = new Set();
    s.sections = [];
    for (const group of groups) {
      const section = { title: group.title, description: group.description ?? '', blogs: [] };
      for (const item of group.blogs) {
        const ref = typeof item === 'string' ? { folder: item } : item ?? {};
        if (!ref.folder) {
          warn(`${slug}/index.md: blog entry without "folder": ${JSON.stringify(item)}`);
          continue;
        }
        if (seen.has(ref.folder)) {
          warn(`${slug}/index.md lists "${ref.folder}" more than once — keeping the first`);
          continue;
        }
        seen.add(ref.folder);
        const blog = loadBlog(s, ref, { includeDrafts, warn });
        if (!blog) continue;
        blog.section = section.title;
        section.blogs.push(blog);
        s.blogs.push(blog);
      }
      if (section.blogs.length) s.sections.push(section);
    }

    // Folders that exist but aren't listed in index.md are not published.
    for (const child of fs.readdirSync(dir, { withFileTypes: true })) {
      if (child.isDirectory() && !seen.has(child.name) && fs.existsSync(path.join(dir, child.name, 'index.md'))) {
        warn(`${slug}/${child.name}/ is not listed in ${slug}/index.md — not published`);
      }
    }

    s.blogs.forEach((b, i) => (b.number = i + 1));
    s.thumbnail ??= s.blogs.find((b) => b.thumbnail)?.thumbnail ?? null;
    s.updated = maxDate([s.date, ...s.blogs.map((b) => b.date)]);
    series.push(s);
  }

  return series.sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

// Standalone blogs, newest first. Shaped like a series so feeds/sitemap can treat them the same.
function loadStandaloneBlogs({ includeDrafts, warn }) {
  const dir = path.join(CONTENT, BLOGS_DIR);
  const collection = { slug: BLOGS_DIR, dir, title: 'Blogs', standalone: true, blogs: [] };
  if (!fs.existsSync(dir)) return collection;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name.startsWith('_')) continue;
    const blog = loadBlog(collection, { folder: entry.name }, { includeDrafts, warn });
    if (blog) collection.blogs.push(blog);
  }
  collection.blogs.sort((a, b) => (b.date ?? 0) - (a.date ?? 0) || a.title.localeCompare(b.title));
  return collection;
}

function loadBlog(series, ref, { includeDrafts, warn }) {
  const slug = ref.folder;
  const dir = path.join(series.dir, slug);
  const file = path.join(dir, 'index.md');
  if (!fs.existsSync(file)) {
    warn(`${series.slug}/index.md lists "${slug}" but ${series.slug}/${slug}/index.md does not exist`);
    return null;
  }

  const { data, content } = matter.read(file);
  if ((data.draft || ref.draft) && !includeDrafts) return null;

  const where = `${series.slug}/${slug}/index.md`;
  const { html, toc, words } = renderMarkdown(content, { warn, where });

  // The series index.md entry overrides the blog's own front matter.
  const thumbRel = ref.thumbnail
    ? checkFile(series.dir, ref.thumbnail, `${series.slug}/index.md`, warn) && path.posix.relative(slug, ref.thumbnail)
    : checkFile(dir, data.thumbnail, where, warn);

  return {
    slug,
    dir,
    title: ref.title || data.title || titleCase(slug),
    subtitle: ref.subtitle || data.subtitle || data.description || '',
    date: data.date ? new Date(data.date) : null,
    tags: data.tags ?? [],
    draft: !!(data.draft || ref.draft),
    thumbnail: assetUrl(`${series.slug}/${slug}`, thumbRel),
    references: normalizeReferences(data.references),
    readingMinutes: Math.max(1, Math.round(words / WORDS_PER_MINUTE)),
    toc,
    html,
  };
}

function normalizeReferences(refs) {
  if (!Array.isArray(refs)) return [];
  return refs.map((r) => {
    if (typeof r === 'string') return { title: r, url: r };
    return { title: r.title ?? r.url, url: r.url ?? r.file ?? '', note: r.note ?? '' };
  });
}

// ---------------------------------------------------------------------------
// Markdown

function renderMarkdown(src, { warn, where }) {
  const toc = [];
  const slugCounts = new Map();
  const marked = new Marked({ gfm: true });

  marked.use({
    renderer: {
      heading({ tokens, depth, text }) {
        const inner = this.parser.parseInline(tokens);
        let id = slugify(stripHtml(text));
        const n = slugCounts.get(id) ?? 0;
        slugCounts.set(id, n + 1);
        if (n) id = `${id}-${n}`;
        if (depth === 2 || depth === 3) toc.push({ depth, id, text: decodeEntities(stripHtml(inner)) });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const external = /^[a-z]+:\/\//i.test(href);
        const url = external ? href : rewriteMdLink(href);
        const t = title ? ` title="${escapeAttr(title)}"` : '';
        const ext = external ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${escapeAttr(url)}"${t}${ext}>${inner}</a>`;
      },
      image({ href, title, text }) {
        const t = title ? ` title="${escapeAttr(title)}"` : '';
        const img = `<img src="${escapeAttr(href)}" alt="${escapeAttr(text)}"${t} loading="lazy">`;
        return title ? `<figure>${img}<figcaption>${escapeHtml(title)}</figcaption></figure>` : img;
      },
      code({ text, lang }) {
        const language = (lang || '').split(/\s+/)[0];
        const cls = language ? ` class="language-${escapeAttr(language)}"` : '';
        return `<pre><code${cls}>${escapeHtml(text)}</code></pre>\n`;
      },
      table(token) {
        // Wrap tables so they scroll horizontally on small screens.
        const html = this.constructor.prototype.table.call(this, token);
        return `<div class="table-wrap">${html}</div>`;
      },
    },
  });

  const html = marked.parse(src);
  const words = src.replace(/```[\s\S]*?```/g, '').split(/\s+/).filter(Boolean).length;
  if (/\]\((\/[^)]*)\)/.test(src)) {
    warn(`${where}: root-relative link/image ("/...") won't respect basePath — use a relative path instead`);
  }
  return { html, toc, words };
}

// Prefix relative src/href values (assets/x.png, ../other/) so HTML can be shown from another folder.
function rebaseHtml(html, prefix) {
  return html.replace(/\b(src|href)="([^"]*)"/gi, (_, attr, url) => `${attr}="${rebaseUrl(url, prefix)}"`);
}

function rebaseUrl(url, prefix) {
  if (!url || /^([a-z][a-z0-9+.-]*:|[#/?])/i.test(url)) return url;
  const rebased = path.posix.normalize(prefix + url);
  return url.endsWith('/') && !rebased.endsWith('/') ? `${rebased}/` : rebased;
}

// `../02-next/index.md#setup` -> `../02-next/#setup`
function rewriteMdLink(href) {
  return href.replace(/(^|\/)(index|README)\.md(?=$|#|\?)/i, '$1').replace(/^(?=#|\?)/, '') || './';
}

// ---------------------------------------------------------------------------
// Feeds

function allBlogs(seriesList) {
  return seriesList
    .flatMap((s) => s.blogs.map((b) => ({ s, b })))
    .sort((x, y) => (y.b.date ?? 0) - (x.b.date ?? 0));
}

// Index for the navbar search. URLs are relative to the site root; the client prefixes them.
const SEARCH_TEXT_LIMIT = 12000;

function searchIndex(seriesList, blogs) {
  const entry = (b, url, extra) => ({
    t: b.title,
    s: b.subtitle,
    u: url,
    tags: b.tags,
    d: b.date ? b.date.toISOString().slice(0, 10) : '',
    h: b.toc.map((h) => [h.text, h.id]),
    x: plainText(b.html).slice(0, SEARCH_TEXT_LIMIT),
    ...extra,
  });
  return [
    ...seriesList.map((s) => ({
      k: 'series', t: s.title, s: s.subtitle, u: `${s.slug}/`, tags: s.tags, n: s.blogs.length,
      x: plainText(s.html), sec: s.sections.map((x) => x.title).filter(Boolean).join(' · '),
    })),
    ...seriesList.flatMap((s) =>
      s.blogs.map((b) => entry(b, `${s.slug}/${b.slug}/`, { k: 'blog', g: s.title, n: b.number, sec: b.section ?? '' }))
    ),
    ...blogs.blogs.map((b) => entry(b, `${BLOGS_DIR}/${b.slug}/`, { k: 'blog' })),
  ];
}

function plainText(html = '') {
  return html
    .replace(/<a class="anchor"[^>]*>#<\/a>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function rssFeed(site, seriesList) {
  const items = allBlogs(seriesList)
    .slice(0, 50)
    .map(({ s, b }) => {
      const link = site.absolute(`${s.slug}/${b.slug}/`);
      return `    <item>
      <title>${escapeHtml(s.standalone ? b.title : `${s.title} — ${b.title}`)}</title>
      <link>${link}</link>
      <guid>${link}</guid>
      ${b.date ? `<pubDate>${b.date.toUTCString()}</pubDate>` : ''}
      <description>${escapeHtml(b.subtitle)}</description>
    </item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeHtml(site.title)}</title>
    <link>${site.absolute('')}</link>
    <description>${escapeHtml(site.description)}</description>
    <language>${site.language ?? 'en'}</language>
${items}
  </channel>
</rss>
`;
}

function sitemap(site, seriesList) {
  const urls = [site.absolute('')];
  if (seriesList.some((s) => !s.standalone)) urls.push(site.absolute(`${SERIES_INDEX}/`));
  for (const s of seriesList) {
    if (!s.standalone || s.blogs.length) urls.push(site.absolute(`${s.slug}/`));
    for (const b of s.blogs) urls.push(site.absolute(`${s.slug}/${b.slug}/`));
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>
`;
}

// ---------------------------------------------------------------------------
// Helpers

let notFoundBase = '';
function normalizeBase(b) {
  return b && b !== '/' ? `/${b.replace(/^\/|\/$/g, '')}` : '';
}

function urlPath(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return '';
  }
}

// Resolve a thumbnail path relative to a content folder into a site URL.
function assetUrl(folder, rel) {
  if (!rel) return null;
  if (/^[a-z]+:\/\//i.test(rel)) return rel;
  return `${ROOT_TOKEN}/${path.posix.join(folder, rel)}`;
}

// Returns `rel` if it's a URL or an existing file under `dir`; otherwise warns and returns null.
function checkFile(dir, rel, where, warn) {
  if (!rel || /^[a-z]+:\/\//i.test(rel)) return rel || null;
  if (fs.existsSync(path.join(dir, rel))) return rel;
  warn(`${where}: thumbnail "${rel}" not found — ignored`);
  return null;
}

function write(rel, data) {
  if (rel.endsWith('.html')) {
    const depth = rel.split('/').length - 1;
    const prefix = rel === '404.html' ? `${notFoundBase}/` : depth ? '../'.repeat(depth) : './';
    data = data.replaceAll(`${ROOT_TOKEN}/`, prefix);
  }
  const out = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, data);
}

// Copy everything except the markdown source (images, assets/, references/, ...).
function copyAssets(src, dest, { skipDirs = false } = {}) {
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs) copyDir(from, to);
    } else if (entry.name !== 'index.md') {
      fs.mkdirSync(dest, { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
}

function copyDir(src, dest) {
  if (fs.existsSync(src)) fs.cpSync(src, dest, { recursive: true, filter: (p) => !path.basename(p).startsWith('.') });
}

function maxDate(dates) {
  const valid = dates.filter(Boolean);
  return valid.length ? new Date(Math.max(...valid)) : null;
}

export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/&[a-z]+;/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

function titleCase(slug) {
  return slug.replace(/^\d+[-_]/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function stripHtml(s) {
  return String(s).replace(/<[^>]*>/g, '');
}

// Heading HTML is already escaped; decode it so the TOC (escaped again on output) shows plain text.
function decodeEntities(s) {
  return s
    .replace(/&(quot|#39|#x27|lt|gt);/g, (_, e) => ({ quot: '"', '#39': "'", '#x27': "'", lt: '<', gt: '>' })[e])
    .replace(/&amp;/g, '&');
}

export function escapeHtml(s = '') {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeAttr(s = '') {
  return escapeHtml(s).replace(/'/g, '&#39;');
}

// Run directly: `node scripts/build.mjs [--drafts]`
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build({ includeDrafts: process.argv.includes('--drafts') }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
