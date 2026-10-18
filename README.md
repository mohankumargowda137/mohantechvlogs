# Mohan Tech Vlogs

A Markdown-powered blog, built into a static site and hosted on **GitHub Pages**.

## Content model

There are two ideas:

- A **blog** is the unit of writing: a folder with `index.md` (+ `assets/`, `references/`).
- A **series** is an ordered list of blogs.

A blog either stands alone in `content/blogs/`, or lives inside a series folder. The blog folder looks
the same either way.

```
content/
├── blogs/                         ← standalone blogs
│   └── ssh-keys-for-github/
│       ├── index.md
│       └── assets/
└── kubernetes/                    ← a series (folder name = URL slug)
    ├── index.md                   ← series title, subtitle, thumbnail, blog order
    ├── thumbnail.png
    ├── 01-why-kubernetes/         ← a blog in the series
    │   ├── index.md
    │   ├── assets/                ← images, diagrams, video
    │   └── references/            ← PDFs, sample code, downloads
    └── 02-pods/
        ├── index.md
        └── assets/
```

| Page | URL |
| --- | --- |
| Home: series (left), standalone blogs (right) | `/` |
| All series / one series (opens on its first blog) | `/series/`, `/<series>/` |
| A blog in a series (with the series sidebar) | `/<series>/<blog>/` |
| All standalone blogs / one standalone blog | `/blogs/`, `/blogs/<blog>/` |

`blogs` and `series` are reserved folder names, so don't use them for a series.

### Series `index.md`

```yaml
---
title: Kubernetes from Scratch
subtitle: Build and run a cluster, one concept at a time.
thumbnail: thumbnail.png        # relative to this folder
order: 1                        # position on the home page
date: 2026-10-10
tags: [kubernetes, devops]
draft: false
blogs:                          # reading order — only listed folders are published
  - folder: 01-why-kubernetes
    subtitle: The problem it solves          # optional: overrides the blog's own
  - folder: 02-pods
    thumbnail: 02-pods/assets/alt.png        # optional: relative to the series folder
---
Intro text for the series (Markdown). Not shown on the page; search uses it.
```

**Sections (optional).** To group the blogs, use `sections:` instead of (or after) `blogs:`.
Sections appear as collapsible groups in the series sidebar; blog numbers continue across them.

```yaml
sections:
  - title: Basics
    description: Optional one-liner
    blogs:
      - folder: 01-why-kubernetes
      - folder: 02-pods
  - title: Networking
    blogs:
      - folder: 03-services
```

**Series pages** open on the first blog with a sidebar listing every blog in the series (by section); each
blog has its own URL and the same sidebar. On phones the sidebar slides in from a "contents" bar.
Standalone blogs have no sidebar.

### Blog `index.md`

```yaml
---
title: Why Kubernetes?
subtitle: The problem it solves
date: 2026-10-10
thumbnail: assets/cover.png
tags: [kubernetes]
draft: false
references:
  - title: Kubernetes docs
    url: https://kubernetes.io/docs/
  - title: Slides (PDF)
    url: references/slides.pdf
    note: from the meetup talk
---
Your blog in Markdown. Images: ![diagram](assets/diagram.png)
Link to another blog: [Pods](../02-pods/index.md)
```

Use **relative** paths for images and links (not `/...`) so they work under the GitHub Pages sub-path.

## Commands

```bash
npm install
npm run dev                                   # preview at http://localhost:4000 (drafts shown, live reload)
npm run build                                 # build to dist/
CONTENT_DIR=../other-content npm run dev      # preview a different content folder
npm run new:blog   -- ssh-keys-for-github "SSH Keys for GitHub"      # standalone → content/blogs/
npm run new:series -- kubernetes "Kubernetes from Scratch"
npm run new:blog   -- kubernetes/01-why-kubernetes "Why Kubernetes?"   # inside a series
npm run new:blog   -- kubernetes/03-services "Services" --section "Networking"
```

## Editor (dev only)

`npm run dev` also serves a content editor at **http://localhost:4000/__admin/**, and every page of
the dev site gets an **✎ Edit** button that opens it there. **Exit editor** (top left, or `Esc`) saves and
takes you back to the page you were editing.

- **Find anything**: press `⌘P` / `Ctrl P` (or `/`, or click *Go to blog or series…* on the home screen), even
  while writing, and type part of a title, series or section. The **home screen** shows your last three opened items, every series and standalone blog
  as a card (click one to open it), and stats; inside a blog or series the sidebar shows just that series.
- **Create** standalone blogs, series, and blogs inside a series/section (same scaffolding as `npm run new:*`).
- **Edit a blog** in three modes:
  - **Write** (default): a visual, Hashnode-style editor ([Milkdown Crepe](https://milkdown.dev)). Add a
    cover, title and subtitle at the top, then just write: type `/` for headings, lists, quotes, code
    blocks, tables, images and dividers; select text for a formatting toolbar; Markdown shortcuts
    (`## `, `- `, `**bold**`, `` ` ``) convert as you type. Paste or drop images to upload them to `assets/`.
  - **Markdown**: the raw source, with a formatting toolbar.
  - **Preview**: the page exactly as readers will see it (same renderer and theme as the build).

  Date, tags, draft, cover path and references live under **⚙ Settings**. Changes **autosave** a few
  seconds after you stop typing (and at least every 30 s while you type); `⌘S` saves right away.
  The pill in the top bar shows *Unsaved changes*, *Saving…*, *Saved* (hover for the time) or
  *Save failed* (hover for the reason; it retries on its own, or click it to retry now).
  Opening a blog never changes it: the body is only rewritten once you edit it in Write mode (as
  standard Markdown with `-` bullets), and images keep their alt text and captions.
- **Edit a series**: details, sections (add, rename, reorder, delete), and blog order by drag and drop;
  unlisted blog folders can be added back.

Saving writes straight to `content/` (only the changed front matter fields are rewritten; untouched
ones keep their formatting and comments), and the dev server rebuilds as usual. The editor lives in
`scripts/admin/`, is mounted only by `scripts/dev.mjs`, never ends up in `dist/`, and only answers
requests from this machine. The visual editor's packages are `devDependencies`, bundled on the fly
with esbuild the first time you open the editor, so run `npm install` after pulling.

## Deploying

1. Push this repo to GitHub.
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Every push to `main` runs `.github/workflows/deploy.yml` and publishes the site to
   `https://<user>.github.io/<repo>/`.

The base path is detected automatically in CI, so a custom domain works without changes.

### Publishing a series before it's merged

To let readers see finished blogs from a series that still lives on its own branch:
**Actions → Deploy to GitHub Pages → Run workflow**, keep "Use workflow from" on `main`, and enter
the branch name(s), e.g. `series/system-design`. The site is built from `main` plus the content
that branch added or changed. Blogs marked `draft: true` stay hidden as usual.

This only lasts until the next deploy: a push to `main` rebuilds from `main` alone, so run the
workflow again (with the branch) after merging anything else. Once the series is merged, plain
`main` deploys include it.
Edit `site.config.json` for the site title, description, author and links.

## Search

The navbar search (click it, or press `⌘K` / `Ctrl K` / `/`) looks through every series and blog:
titles, subtitles, tags, headings and the full text. The build writes the index to
`dist/search.json`; it's only downloaded when someone opens search. A match in a heading links
straight to that heading.

## Customizing

- `theme/layout.mjs` — HTML templates for the home, series and blog pages (one `blogPage` for both kinds of blog)
- `theme/assets/style.css` — styles (light/dark)
- `theme/assets/main.js` — code highlighting, copy buttons, theme toggle, TOC highlighting
