#!/usr/bin/env node
/**
 * LaTeX packages the typographic PDF export needs, read from the preamble that
 * ships with the app, plus what those packages load and TeX Live does not pull
 * in on minimal installs (TinyTeX on Windows and macOS CI).
 *
 *   node scripts/lib/latex-packages.cjs --install   update tlmgr and install every package
 *   node scripts/lib/latex-packages.cjs --check     fail if a .sty is missing
 */
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const PREAMBLE = join(__dirname, '../../packages/infrastructure/src/export/latexPreamble.tex');

// Style files loaded indirectly that are not in every minimal TeX Live.
const INDIRECT_STYLES = ['fancyvrb', 'upquote', 'lineno', 'zref-abspage', 'needspace', 'xcolor', 'tikz'];

// Style files the Pandoc LaTeX template loads for LuaLaTeX.
const TEMPLATE_STYLES = [
  'amsmath', 'bookmark', 'fontspec', 'footnotehyper', 'geometry', 'graphicx', 'hyperref',
  'iftex', 'parskip', 'selnolig', 'unicode-math', 'xurl',
];

// TinyTeX starts minimal. Instead of whole collections (collection-latexextra
// alone multiplied the Windows bundle and made it unusably slow to unpack),
// install the packages the export really reads: the list comes from a
// `lualatex -recorder` run of a document using every Markdown feature with the
// Pandoc template, the preamble and the table filter. Names follow the current
// TeX Live (l3backend, for example, now ships inside l3kernel).
const RUNTIME_PACKAGES = [
  'amsfonts', 'amsmath', 'auxhook', 'bigintcalc', 'bitset', 'bookmark', 'booktabs',
  'colortbl', 'ctablestack', 'epstopdf-pkg', 'etexcmds', 'etoolbox', 'fancyhdr', 'fancyvrb',
  'fontspec', 'footnotehyper', 'fvextra', 'geometry', 'gettitlestring', 'graphics',
  'graphics-cfg', 'graphics-def', 'hycolor', 'hyperref', 'iftex', 'infwarerr', 'intcalc',
  'kvdefinekeys', 'kvoptions', 'kvsetkeys', 'l3kernel', 'l3packages',
  'latexconfig', 'lineno', 'lm', 'lm-math', 'ltxcmds', 'lua-uni-algos', 'lua-ul',
  'lualatex-math', 'lualibs', 'luacolor', 'luaotfload', 'luatexbase', 'mdframed',
  'microtype', 'needspace', 'parskip', 'pdfescape', 'pdftexcmds', 'pgf', 'refcount',
  'rerunfilecheck', 'selnolig', 'setspace', 'stringenc', 'tex-ini-files', 'titlesec',
  'tools', 'unicode-data', 'unicode-math', 'uniquecounter', 'upquote', 'url', 'xcolor',
  'xurl', 'zref',
];

// TeX Live package that provides a style file, when the names differ.
const TLMGR_PACKAGE = {
  array: 'tools',
  calc: 'tools',
  longtable: 'tools',
  graphicx: 'graphics',
  tikz: 'pgf',
  'zref-abspage': 'zref',
};

/** Style files named by \usepackage / \RequirePackage in the preamble. */
function preambleStyles(source = readFileSync(PREAMBLE, 'utf8')) {
  const styles = new Set();
  const withoutComments = source.replace(/(^|[^\\])%.*$/gm, '$1');
  for (const match of withoutComments.matchAll(/\\(?:usepackage|RequirePackage)\s*(?:\[[^\]]*\])?\s*\{([^}]+)\}/g)) {
    for (const name of match[1].split(',')) {
      if (name.trim()) styles.add(name.trim());
    }
  }
  return [...styles];
}

function requiredStyles() {
  return [...new Set([...preambleStyles(), ...INDIRECT_STYLES, ...TEMPLATE_STYLES])].sort();
}

function tlmgrPackages(styles = requiredStyles()) {
  return [...new Set(styles.map((style) => TLMGR_PACKAGE[style] ?? style))].sort();
}

/** Style files `kpsewhich` cannot resolve in the given TeX installation. */
function missingStyles(kpsewhich = 'kpsewhich', styles = requiredStyles()) {
  return styles.filter((style) => {
    const result = spawnSync(kpsewhich, [`${style}.sty`], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: process.platform === 'win32' && !/[\\/]/.test(kpsewhich),
    });
    return result.status !== 0 || !result.stdout.trim();
  });
}

function tlmgr(args) {
  console.log(`tlmgr ${args.join(' ')}`);
  // tlmgr is a .bat launcher on Windows: it needs a shell there.
  const result = spawnSync('tlmgr', args, { stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    throw new Error(`tlmgr ${args[0]} failed with exit code ${result.status ?? 'unknown'}`);
  }
}

function main(argv) {
  if (argv.includes('--install')) {
    // A TinyTeX older than its package repository refuses every install until
    // tlmgr updates itself; stop at the first failure instead of going on.
    tlmgr(['update', '--self']);
    tlmgr(['install', ...new Set([...RUNTIME_PACKAGES, ...tlmgrPackages()])]);
  }
  if (argv.includes('--check') || argv.includes('--install')) {
    const missing = missingStyles();
    if (missing.length > 0) {
      console.error(`Missing LaTeX packages: ${missing.join(', ')}`);
      console.error(`Install them with: tlmgr install ${tlmgrPackages(missing).join(' ')}`);
      process.exit(1);
    }
    console.log(`LaTeX packages for PDF export: ${requiredStyles().length} found`);
  }
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

module.exports = { RUNTIME_PACKAGES, missingStyles, preambleStyles, requiredStyles, tlmgrPackages };
