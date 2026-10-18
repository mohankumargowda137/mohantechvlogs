// Visual (WYSIWYG) Markdown editor for the dev content editor, built on Milkdown Crepe.
// Bundled on demand by scripts/admin/server.mjs (esbuild) and served at /__admin/rich/editor.js.
import { Crepe } from '@milkdown/crepe';
import { imageBlockSchema } from '@milkdown/kit/component/image-block';
import { imageSchema } from '@milkdown/kit/preset/commonmark';
import { remarkGFMPlugin } from '@milkdown/kit/preset/gfm';
import { remarkStringifyOptionsCtx } from '@milkdown/kit/core';
import { uploadConfig } from '@milkdown/kit/plugin/upload';
// The theme's style.css minus math (KaTeX fonts), AI and diff styles.
import '@milkdown/crepe/theme/common/prosemirror.css';
import '@milkdown/crepe/theme/common/reset.css';
import '@milkdown/crepe/theme/common/block-edit.css';
import '@milkdown/crepe/theme/common/code-mirror.css';
import '@milkdown/crepe/theme/common/cursor.css';
import '@milkdown/crepe/theme/common/image-block.css';
import '@milkdown/crepe/theme/common/link-tooltip.css';
import '@milkdown/crepe/theme/common/list-item.css';
import '@milkdown/crepe/theme/common/placeholder.css';
import '@milkdown/crepe/theme/common/toolbar.css';
import '@milkdown/crepe/theme/common/table.css';

// `onChange(markdown)` gets null while the document still matches what was loaded, so an untouched
// blog keeps its original Markdown byte for byte.
export async function createRichEditor(root, { markdown, onChange, upload, resolveUrl, placeholder }) {
  const crepe = new Crepe({
    root,
    defaultValue: markdown,
    features: {
      [Crepe.Feature.Latex]: false, // the site doesn't render math
      [Crepe.Feature.AI]: false,
      [Crepe.Feature.TopBar]: false,
    },
    featureConfigs: {
      [Crepe.Feature.ImageBlock]: {
        onUpload: upload,
        proxyDomURL: resolveUrl,
        blockCaptionPlaceholderText: 'Write a caption (shown under the image)',
        blockUploadPlaceholderText: 'or paste an image link',
        inlineUploadPlaceholderText: 'or paste an image link',
      },
      [Crepe.Feature.Placeholder]: { text: placeholder, mode: 'block' },
    },
  });
  crepe.editor
    .config(keepImageAltText)
    .config(keepUntitledInlineImages)
    // Match the repo's style: `-` bullets and `---` dividers.
    .config((ctx) => ctx.update(remarkStringifyOptionsCtx, (o) => ({ ...o, bullet: '-', rule: '-' })))
    // Don't pad table columns to equal width: tables with long links become unreadable as Markdown.
    .config((ctx) => ctx.set(remarkGFMPlugin.options.key, { tablePipeAlign: false }))
    // Pasted or dropped images go to the blog's assets/ folder instead of becoming base64 data URLs.
    .config((ctx) =>
      ctx.update(uploadConfig.key, (prev) => ({
        ...prev,
        uploader: async (files, schema) => {
          const images = [...files].filter((f) => f.type.startsWith('image/'));
          const nodes = await Promise.all(images.map(async (file) => {
            const src = await upload(file);
            return schema.nodes.image.createAndFill({ src, alt: altFromFile(src), title: '' });
          }));
          return nodes.filter(Boolean);
        },
      }))
    );
  await crepe.create();
  // A missing image would otherwise render as an invisible block that's easy to delete by accident.
  root.addEventListener('error', (e) => markImage(e.target, true), true);
  root.addEventListener('load', (e) => markImage(e.target, false), true);
  const baseline = crepe.getMarkdown();
  crepe.on((l) => l.markdownUpdated((_ctx, md) => onChange(md === baseline ? null : md)));
  return {
    getMarkdown: () => crepe.getMarkdown(),
    focus: () => crepe.editor.ctx && root.querySelector('.ProseMirror')?.focus(),
    destroy: () => crepe.destroy(),
  };
}

// Crepe's image block writes its resize ratio into the alt text (`![1.00](src)`). The site needs real
// alt text and has no use for the ratio, so keep `alt` as an attribute and write it back instead.
// The caption stays in the title, which the site renders as the figure caption.
function keepImageAltText(ctx) {
  const base = ctx.get(imageBlockSchema.key);
  ctx.set(imageBlockSchema.key, (c) => {
    const schema = base(c);
    return {
      ...schema,
      attrs: { ...schema.attrs, alt: { default: '' } },
      parseDOM: schema.parseDOM.map((rule) => ({
        ...rule,
        getAttrs: (dom) => ({ ...rule.getAttrs(dom), alt: dom.getAttribute('alt') || '' }),
      })),
      parseMarkdown: {
        match: schema.parseMarkdown.match,
        runner: (state, node, type) => state.addNode(type, { src: node.url, caption: node.title ?? '', ratio: 1, alt: node.alt ?? '' }),
      },
      toMarkdown: {
        match: schema.toMarkdown.match,
        runner: (state, node) => {
          const { src, caption, alt } = node.attrs;
          state.openNode('paragraph');
          state.addNode('image', undefined, undefined, { url: src, title: caption || null, alt: alt || altFromFile(src) });
          state.closeNode();
        },
      },
    };
  });
}

function markImage(img, broken) {
  if (img.tagName !== 'IMG' || !img.parentElement) return;
  img.parentElement.classList.toggle('is-broken', broken);
  img.parentElement.dataset.missing = broken ? img.getAttribute('src').replace(/^\/__admin\/content\/[^/]+\/[^/]+\//, '') : '';
}

const altFromFile = (src) => decodeURIComponent(src.split(/[?#]/)[0].split('/').pop() || 'image').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');

// Inline images without a title (`text ![alt](src) text`) arrive with title: null, which fails the
// schema's string check, so the image silently vanished from the document.
function keepUntitledInlineImages(ctx) {
  const base = ctx.get(imageSchema.key);
  ctx.set(imageSchema.key, (c) => {
    const schema = base(c);
    return {
      ...schema,
      parseMarkdown: {
        match: schema.parseMarkdown.match,
        runner: (state, node, type) => state.addNode(type, { src: node.url ?? '', alt: node.alt ?? '', title: node.title ?? '' }),
      },
    };
  });
}
