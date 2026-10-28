#!/usr/bin/env node
/**
 * LaTeX packages the typographic PDF export needs, read from the preamble that
 * ships with the app, plus what those packages load and TeX Live does not pull
 * in on minimal installs (TinyTeX on Windows and macOS CI).
 *
 *   node scripts/lib/latex-packages.cjs --install   tlmgr install every package
 *   node scripts/lib/latex-packages.cjs --check     fail if a .sty is missing
 */
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const PREAMBLE = join(__dirname, '../../packages/infrastructure/src/export/latexPreamble.tex');

// Style files loaded indirectly that are not in every minimal TeX Live.
const INDIRECT_STYLES = ['fancyvrb', 'upquote', 'lineno', 'zref-abspage', 'needspace', 'xcolor', 'tikz'];

// TeX Live package that provides a style file, when the names differ.
const TLMGR_PACKAGE = {
  array: 'tools',
  calc: 'tools',
  longtable: 'tools',
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
  return [...new Set([...preambleStyles(), ...INDIRECT_STYLES])].sort();
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

function main(argv) {
  if (argv.includes('--install')) {
    const packages = tlmgrPackages();
    console.log(`tlmgr install ${packages.join(' ')}`);
    const result = spawnSync('tlmgr', ['install', ...packages], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    if (result.status !== 0) process.exit(result.status ?? 1);
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

if (require.main === module) main(process.argv.slice(2));

module.exports = { missingStyles, preambleStyles, requiredStyles, tlmgrPackages };
