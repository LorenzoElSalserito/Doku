const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const { join, delimiter, resolve } = require('node:path');

function certifyExportRuntime(source) {
  const temporary = fs.mkdtempSync(join(tmpdir(), 'doku portable '));
  const runtime = join(temporary, 'export-runtime');
  try {
    fs.cpSync(source, runtime, { recursive: true, dereference: true });
    const windows = process.platform === 'win32';
    const pythonHome = join(runtime, 'weasy-python');
    const python = join(pythonHome, windows ? 'python.exe' : 'bin/python');
    const version = windows ? '' : fs.readdirSync(join(pythonHome, 'lib')).find((name) => /^python\d/.test(name));
    const pythonPath = windows ? join(pythonHome, 'Lib/site-packages') : join(pythonHome, 'lib', version, 'site-packages');
    const latex = join(runtime, 'latex');
    const bin = join(latex, 'bin');
    const suffix = windows ? '.exe' : '';
    // Keep only OS essentials. No Python, GTK, Pandoc or TeX from the build PATH.
    const env = {
      ...(windows ? { SystemRoot: process.env.SystemRoot, WINDIR: process.env.WINDIR } : {}),
      PATH: bin,
      HOME: temporary, USERPROFILE: temporary, TEMP: temporary, TMP: temporary,
      XDG_CACHE_HOME: temporary,
      XDG_DATA_HOME: runtime,
      PYTHONHOME: pythonHome, PYTHONPATH: pythonPath, PYTHONNOUSERSITE: '1',
      LD_LIBRARY_PATH: join(runtime, 'lib'),
      DYLD_LIBRARY_PATH: join(runtime, 'lib'),
      DYLD_FALLBACK_LIBRARY_PATH: join(runtime, 'lib'),
      FONTCONFIG_FILE: join(runtime, 'fontconfig.conf'),
      WEASYPRINT_DLL_DIRECTORIES: join(runtime, 'lib'),
      TEXMFROOT: join(latex, 'share/texlive'),
      TEXMFDIST: join(latex, 'share/texlive/texmf-dist'),
      TEXMFHOME: temporary, TEXMFCONFIG: temporary,
      TEXMFDEBIAN: join(latex, 'share/texmf-debian'),
      TEXMFLOCAL: join(latex, 'share/texmf'),
      TEXMFSYSVAR: join(latex, 'var/lib/texmf'),
      TEXMFSYSCONFIG: join(latex, 'etc/texmf'),
      TEXMFCNF: [join(latex, 'etc/texmf/web2c'), join(latex, 'share/texlive/texmf-dist/web2c')].join(delimiter),
      TEXMFVAR: temporary, TEXMFCACHE: temporary,
      OSFONTDIR: join(runtime, 'fonts'),
    };
    const isolate = process.platform === 'linux' && process.env.DOKU_SMOKE_ISOLATE === '1';
    const run = (command, args) => {
      const options = { env, cwd: temporary, stdio: 'inherit', timeout: 180_000 };
      if (!isolate) return execFileSync(command, args, options);
      // No /usr, host libraries, fonts, TeX trees, Python or network are visible.
      return execFileSync('/usr/bin/bwrap', [
        '--die-with-parent', '--unshare-net', '--bind', temporary, temporary,
        '--dir', '/lib64', '--ro-bind', join(runtime, 'lib/ld-linux-x86-64.so.2'), '/lib64/ld-linux-x86-64.so.2',
        '--proc', '/proc', '--dev', '/dev', '--chdir', temporary, '--', command, ...args,
      ], options);
    };
    run(python, ['-c', [
      'from weasyprint.text.ffi import ffi, fontconfig',
      'config = ffi.gc(fontconfig.FcInitLoadConfigAndFonts(), fontconfig.FcConfigDestroy)',
      'fonts = fontconfig.FcConfigGetFonts(config, fontconfig.FcSetSystem)',
      'assert fonts != ffi.NULL and fonts.nfont > 0, "Bundled Fontconfig found no fonts"',
      'print("Bundled Fontconfig fonts:", fonts.nfont)',
    ].join('; ')]);
    const markdown = join(temporary, 'document.md');
    const html = join(temporary, 'document.html');
    fs.writeFileSync(markdown, '# Doku\n\nDocumento portabile: accenti àèìòù, **grassetto**, formula $x^2$.\n');
    run(join(bin, `pandoc${suffix}`), [markdown, `--data-dir=${join(latex, 'share/pandoc')}`, '--standalone', '--metadata=title:Doku', '--output', html]);
    run(python, [join(runtime, 'scripts/render_weasy_pdf.py'), html, join(temporary, 'weasy.pdf')]);
    if (process.platform === 'linux') {
      // Import succeeds on a developer host even when dlopen roots were omitted.
      run(python, ['-c', [
        'import os',
        'from weasyprint import HTML',
        'HTML(string="<p>Doku</p>").write_pdf("probe.pdf")',
        'paths = [line.split(None, 5)[-1].strip() for line in open("/proc/self/maps") if "/" in line]',
        `escaped = [p for p in paths if any(n in p for n in ('libpango', 'libgobject', 'libharfbuzz', 'libfontconfig', 'libfreetype')) and not p.startswith(${JSON.stringify(resolve(runtime))})]`,
        'assert not escaped, "Libraries loaded from host: " + str(escaped)',
      ].join('; ')]);
    }
    if (process.platform === 'darwin') {
      run(python, ['-c', [
        'from weasyprint import HTML',
        'HTML(string="<p>Doku</p>").write_pdf()',
        'import ctypes',
        'dyld = ctypes.CDLL(None)',
        'dyld._dyld_get_image_name.restype = ctypes.c_char_p',
        'paths = [dyld._dyld_get_image_name(i).decode() for i in range(dyld._dyld_image_count())]',
        `escaped = [p for p in paths if not p.startswith(('/System/Library/', '/usr/lib/', ${JSON.stringify(resolve(runtime))}))]`,
        'assert not escaped, "Libraries loaded from host: " + str(escaped)',
      ].join('; ')]);
    }
    run(join(bin, `pandoc${suffix}`), [markdown, `--data-dir=${join(latex, 'share/pandoc')}`, '--standalone', `--pdf-engine=${join(bin, `lualatex${suffix}`)}`,
      '--pdf-engine-opt=-halt-on-error', '-V', 'mainfont=Inter', '--output', join(temporary, 'latex.pdf')]);
    for (const name of ['weasy.pdf', 'latex.pdf']) {
      const pdf = fs.readFileSync(join(temporary, name));
      if (pdf.length < 500 || pdf.subarray(0, 5).toString() !== '%PDF-') throw new Error(`Invalid PDF: ${name}`);
    }
    console.log('- Pandoc, WeasyPrint and LuaLaTeX export after relocation with host PATH disabled');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

module.exports = { certifyExportRuntime };
