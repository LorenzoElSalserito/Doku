const { existsSync, readdirSync, lstatSync } = require('node:fs');
const { join } = require('node:path');
const { execFileSync } = require('node:child_process');

function verifyExportRuntime(runtime, platform) {
  const windows = platform === 'win32';
  const suffix = windows ? '.exe' : '';
  const required = [
    'fontconfig.conf', 'printStylesheet.css', 'scripts/render_weasy_pdf.py', 'fonts/Inter.ttf',
    `weasy-python/${windows ? 'python.exe' : 'bin/python'}`,
    `latex/bin/pandoc${suffix}`, `latex/bin/lualatex${suffix}`,
    'latex/share/pandoc',
    'latex/share/texlive/texmf-dist/web2c/texmf.cnf',
  ];
  if (windows) required.push('weasy-python/Lib/encodings/__init__.py', 'weasy-python/Lib/site-packages/weasyprint/__init__.py', 'lib/libgobject-2.0-0.dll', 'lib/libpango-1.0-0.dll');
  else {
    const lib = join(runtime, 'weasy-python/lib');
    const version = existsSync(lib) && readdirSync(lib).find((entry) => /^python\d/.test(entry));
    if (!version) throw new Error('Bundled Python standard library missing');
    required.push(`weasy-python/lib/${version}/encodings/__init__.py`, `weasy-python/lib/${version}/site-packages/weasyprint/__init__.py`);
    if (platform === 'linux') required.push('lib/libgobject-2.0.so.0', 'lib/libpango-1.0.so.0');
    else required.push('lib/libgobject-2.0.0.dylib', 'lib/libpango-1.0.0.dylib');
  }
  const missing = required.filter((entry) => !existsSync(join(runtime, entry)));
  if (missing.length) throw new Error(`Bundled export runtime incomplete: ${missing.join(', ')}`);
  function checkLinks(directory) {
    for (const entry of readdirSync(directory)) {
      const file = join(directory, entry);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error(`Host-dependent symlink in export runtime: ${file}`);
      if (stat.isDirectory()) checkLinks(file);
    }
  }
  checkLinks(join(runtime, 'latex'));
}

exports.verifyExportRuntime = verifyExportRuntime;
exports.default = async (context) => {
  execFileSync(process.execPath, [join(__dirname, 'verify-packaging-assets.js'), '--require-build'], { stdio: 'inherit' });
  verifyExportRuntime(join(__dirname, '../build/export-runtime'), context.electronPlatformName);
};
