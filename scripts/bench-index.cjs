#!/usr/bin/env node
/**
 * Vault indexing benchmark (PLAN Part 2, K0.3; budgets in PRD V2.4.2).
 *
 * Generates deterministic synthetic vaults (default 1k and 10k notes) with
 * front matter, headings, wikilinks, tags and tasks, then times an indexer
 * over each one. Until Sprint K1 ships the real IndexBuilder, the indexer is
 * a baseline scan (read every note, extract links, tags, headings and tasks)
 * that gives the floor the real index has to stay close to.
 *
 * Usage:
 *   npm run bench:index
 *   node scripts/bench-index.cjs --sizes 1000,10000 --runs 3 --out /path --keep
 *   node scripts/bench-index.cjs --indexer ./path/to/indexer.cjs
 *     (module exporting `async buildIndex(rootDir) => { notes: number }`)
 *
 * Vaults go under --out, else $TMPDIR, else the OS temp folder; on machines
 * where /tmp is a small tmpfs point TMPDIR to a folder on disk.
 */
const { mkdtempSync, promises: fs } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { performance } = require('node:perf_hooks');

function parseArgs(argv) {
  const options = { sizes: [1000, 10000], runs: 3, out: null, keep: false, indexer: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      index += 1;
      if (index >= argv.length) throw new Error(`Missing value for ${arg}`);
      return argv[index];
    };
    if (arg === '--sizes')
      options.sizes = next()
        .split(',')
        .map((value) => Number(value));
    else if (arg === '--runs') options.runs = Number(next());
    else if (arg === '--out') options.out = resolve(next());
    else if (arg === '--indexer') options.indexer = resolve(next());
    else if (arg === '--keep') options.keep = true;
    else if (arg === '--help') {
      console.log(require('node:fs').readFileSync(__filename, 'utf-8').split('*/')[0]);
      process.exit(0);
    } else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.sizes.some((size) => !Number.isInteger(size) || size < 1)) {
    throw new Error('--sizes takes positive integers, e.g. 1000,10000');
  }
  if (!Number.isInteger(options.runs) || options.runs < 1) {
    throw new Error('--runs takes a positive integer');
  }
  return options;
}

/** Small deterministic PRNG (mulberry32) so every run builds the same vault. */
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WORDS = (
  'local first note vault index link graph block query task journal template card ' +
  'canvas history script export import search property tag outline daily review ' +
  'project research decision meeting idea draft summary source reference archive'
).split(' ');
const TAGS = ['reading', 'method', 'people', 'project', 'idea', 'review', 'method/zettelkasten'];
const FOLDERS = ['pages', 'projects', 'journals', 'areas/work', 'areas/home', 'archive'];

function sentence(random, length) {
  const words = [];
  for (let index = 0; index < length; index += 1) {
    words.push(WORDS[Math.floor(random() * WORDS.length)]);
  }
  const text = words.join(' ');
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`;
}

function noteName(index) {
  return `Note ${String(index).padStart(5, '0')}`;
}

async function generateVault(rootDir, size) {
  const random = createRandom(size);
  for (const folder of FOLDERS) {
    await fs.mkdir(join(rootDir, ...folder.split('/')), { recursive: true });
  }
  let bytes = 0;
  for (let index = 0; index < size; index += 1) {
    const folder = FOLDERS[index % FOLDERS.length];
    const links = Array.from({ length: 1 + Math.floor(random() * 6) }, () =>
      // 2% of links point to notes that do not exist (unresolved links).
      random() < 0.02
        ? `[[Missing ${Math.floor(random() * 50)}]]`
        : `[[${noteName(Math.floor(random() * size))}]]`,
    );
    const tags = Array.from(
      { length: Math.floor(random() * 3) },
      () => `#${TAGS[Math.floor(random() * TAGS.length)]}`,
    );
    const paragraphs = Array.from({ length: 2 + Math.floor(random() * 6) }, () =>
      sentence(random, 12 + Math.floor(random() * 40)),
    );
    const tasks =
      random() < 0.3 ? `\n- [ ] ${sentence(random, 6)}\n- [x] ${sentence(random, 5)}\n` : '';
    const content =
      `---\ntype: ${folder.split('/')[0]}\ncreated: 2026-${String(1 + (index % 12)).padStart(2, '0')}-${String(1 + (index % 28)).padStart(2, '0')}\nrating: ${index % 5}\n---\n\n` +
      `# ${noteName(index)}\n\n${paragraphs[0]} ${links.join(' ')}\n\n## Details\n\n${paragraphs.slice(1).join('\n\n')}\n${tasks}\n${tags.join(' ')}\n`;
    bytes += Buffer.byteLength(content);
    await fs.writeFile(
      join(rootDir, ...folder.split('/'), `${noteName(index)}.md`),
      content,
      'utf-8',
    );
  }
  return bytes;
}

/** Baseline indexer: one pass over every note with regular expressions. */
async function baselineIndex(rootDir) {
  const entries = await fs.readdir(rootDir, { recursive: true, withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath ?? entry.path, entry.name));
  const titles = new Set(files.map((file) => file.slice(file.lastIndexOf('/') + 1, -3)));
  let links = 0;
  let unresolved = 0;
  let tags = 0;
  let headings = 0;
  let tasks = 0;
  for (const file of files) {
    const text = await fs.readFile(file, 'utf-8');
    for (const match of text.matchAll(/\[\[([^\]|#^]+)[^\]]*\]\]/g)) {
      links += 1;
      if (!titles.has(match[1].trim())) unresolved += 1;
    }
    tags += (text.match(/(^|\s)#[\p{L}\p{N}_/-]+/gu) ?? []).length;
    headings += (text.match(/^#{1,6}\s/gm) ?? []).length;
    tasks += (text.match(/^\s*- \[[ xX]\]/gm) ?? []).length;
  }
  return { notes: files.length, links, unresolved, tags, headings, tasks };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const indexer = options.indexer ? require(options.indexer).buildIndex : baselineIndex;
  const indexerName = options.indexer ?? 'baseline-scan';
  const base = options.out ?? mkdtempSync(join(process.env.TMPDIR || tmpdir(), 'doku-bench-'));
  await fs.mkdir(base, { recursive: true });
  const results = [];

  try {
    for (const size of options.sizes) {
      const vaultDir = join(base, `vault-${size}`);
      await fs.rm(vaultDir, { recursive: true, force: true });
      const generationStart = performance.now();
      const bytes = await generateVault(vaultDir, size);
      const generationMs = performance.now() - generationStart;

      const timings = [];
      let summary = null;
      for (let run = 0; run < options.runs; run += 1) {
        const start = performance.now();
        summary = await indexer(vaultDir);
        timings.push(performance.now() - start);
      }
      if (!summary || summary.notes !== size) {
        throw new Error(`Indexer saw ${summary?.notes} notes, expected ${size}`);
      }
      results.push({
        notes: size,
        megabytes: Number((bytes / 1024 / 1024).toFixed(2)),
        generationMs: Math.round(generationMs),
        indexMedianMs: Math.round(median(timings)),
        indexMinMs: Math.round(Math.min(...timings)),
        notesPerSecond: Math.round(size / (median(timings) / 1000)),
        summary,
      });
    }
  } finally {
    if (!options.keep) {
      // With --out only the generated vaults go; the folder itself is the user's.
      const targets = options.out
        ? options.sizes.map((size) => join(base, `vault-${size}`))
        : [base];
      for (const target of targets) {
        await fs.rm(target, { recursive: true, force: true });
      }
    }
  }

  console.log(`Doku index benchmark, indexer: ${indexerName}, runs: ${options.runs}`);
  console.table(results.map(({ summary: _summary, ...row }) => row));
  console.log(JSON.stringify({ indexer: indexerName, node: process.version, results }, null, 2));
  if (options.keep) console.log(`Vaults kept in ${base}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
