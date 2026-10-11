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
