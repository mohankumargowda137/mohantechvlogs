// Scaffold content. A blog is the atomic unit; it stands alone or lives in a series.
//   npm run new:blog   -- <blog-folder> "Blog Title"                    standalone → content/blogs/<blog-folder>/
//   npm run new:blog   -- <series>/<blog-folder> "Blog Title" [--section "Section Title"]   inside a series
//   npm run new:series -- <series-folder> "Series Title"
import { createBlog, createSeries } from './content.mjs';

const argv = process.argv.slice(2);
// Pull out `--section "Name"` before reading positional arguments.
const sectionFlag = argv.indexOf('--section');
const sectionName = sectionFlag >= 0 ? argv.splice(sectionFlag, 2)[1] : null;
const [kind, ...args] = argv;

try {
  if (kind === 'series') {
    const { rel, message } = createSeries(...args);
    console.log(`✓ ${message} — add a thumbnail.png and run npm run new:blog -- ${rel}/<blog-folder> "Title"`);
  } else if (kind === 'blog') {
    console.log(`✓ ${createBlog(args[0], args[1], sectionName).message}`);
  } else {
    throw new Error('Usage: node scripts/new.mjs <blog|series> ...');
  }
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}
