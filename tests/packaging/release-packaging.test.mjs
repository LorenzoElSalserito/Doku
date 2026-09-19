import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { spawnSync, execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const meta = require('../../scripts/lib/release-meta.js')
const bump = require('../../scripts/version-bump.js')
const deb = require('../../scripts/deb-finalize.js')
const has = (command) => spawnSync('sh', ['-c', `command -v ${command}`], { stdio: 'ignore' }).status === 0

test('RPM certification rejects build paths, interpreters and bundled library requirements', () => {
  const { verifyRequirements } = require('../../scripts/lib/rpm-runtime.cjs')
  const allowed = ['/bin/sh', 'rpmlib(PayloadIsXz) <= 5.2-1']
  assert.doesNotThrow(() => verifyRequirements(allowed))
  for (const dependency of ['/bin/python3', '/home/lorenzo/IdeaProjects/Doku/build/export-runtime/weasy-python/bin/python',
    'libdb-5.3.so(DB5_3)(64bit)', 'libjpeg-8296d2fa.so.62.4.0(LIBJPEG_6.2)(64bit)',
    'libncursesw.so.6(NCURSESW6_5.1.20000708)(64bit)']) {
    assert.throws(() => verifyRequirements([...allowed, dependency]), (error) => error.message.includes(dependency))
  }
})

test('Mach-O dependency parser ignores universal architecture headers and deduplicates libraries', () => {
  const { parseDependencies } = require('../../scripts/lib/macho-dependencies.cjs')
  const library = '\t/usr/lib/libSystem.B.dylib (compatibility version 1.0.0, current version 1351.0.0)'
  assert.deepEqual(parseDependencies(`/tmp/path with spaces/kpsewhich (architecture x86_64):\n${library}\n/tmp/path with spaces/kpsewhich (architecture arm64):\n${library}\n\t@rpath/libtest.dylib (compatibility version 2.0.0, current version 2.1.0)\n`),
    ['/usr/lib/libSystem.B.dylib', '@rpath/libtest.dylib'])
  assert.deepEqual(parseDependencies(`/tmp/python:\n${library}\n`), ['/usr/lib/libSystem.B.dylib'])
})

test('Mach-O install names come from otool -D, including stale delocate ids', () => {
  const { parseInstallNames } = require('../../scripts/lib/macho-dependencies.cjs')
  // Pillow wheels keep the id delocate gave them at build time.
  assert.deepEqual(parseInstallNames('/tmp/site-packages/PIL/.dylibs/libXau.6.dylib:\n/DLC/PIL/.dylibs/libXau.6.dylib\n'),
    ['/DLC/PIL/.dylibs/libXau.6.dylib'])
  assert.deepEqual(parseInstallNames('/tmp/lib (architecture x86_64):\n@rpath/libz.1.dylib\n/tmp/lib (architecture arm64):\n@rpath/libz.1.dylib\n'),
    ['@rpath/libz.1.dylib'])
  // Executables carry no LC_ID_DYLIB: otool -D prints the header only.
  assert.deepEqual(parseInstallNames('/tmp/path with spaces/pandoc:\n'), [])
})

test('Pandoc data survives file-only packaging with embedded or external defaults', async () => {
  const { preparePandocData } = require('../../scripts/lib/pandoc-data.cjs')
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'doku-pandoc-data-'))
  try {
    const source = path.join(temp, 'external')
    const destination = path.join(temp, 'runtime/share/pandoc')
    await preparePandocData(source, destination)
    const packaged = path.join(temp, 'packaged/share/pandoc')
    // Artifact builders enumerate files; empty directories are not retained.
    for (const name of fs.readdirSync(destination)) {
      if (!fs.statSync(path.join(destination, name)).isFile()) continue
      fs.mkdirSync(packaged, { recursive: true })
      fs.copyFileSync(path.join(destination, name), path.join(packaged, name))
    }
    assert.ok(fs.statSync(packaged).isDirectory())
    fs.mkdirSync(path.join(source, 'templates'), { recursive: true })
    fs.writeFileSync(path.join(source, 'templates/default.latex'), 'external template')
    await preparePandocData(source, destination)
    assert.equal(fs.readFileSync(path.join(destination, 'templates/default.latex'), 'utf8'), 'external template')
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
})

test('LaTeX table filter runs on the oldest supported Pandoc and sizes wide tables', (t) => {
  const filter = path.resolve(import.meta.dirname, '../../packages/infrastructure/src/export/tableWidths.lua')
  // `walk` and the current Table AST arrived after Pandoc 2.9, the oldest
  // release a supported host can bundle: the filter must not call them.
  assert.ok(!/[:.]walk\s*\(/.test(fs.readFileSync(filter, 'utf8')), 'tableWidths.lua must not use :walk')
  if (!has('pandoc')) return t.skip('pandoc is not installed')
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'doku-table-filter-'))
  try {
    const markdown = path.join(temp, 'document.md')
    fs.writeFileSync(markdown, [
      '# Titolo con identificatore_lunghissimo_di_prova_che_supera_trenta_caratteri',
      '',
      '| Colonna A | Colonna B | Colonna C | Colonna D | Colonna E |',
      '| --- | --- | --- | --- | --- |',
      '| identificatore_molto_lungo | b | c | d | e |',
      '',
    ].join('\n'))
    const latex = execFileSync('pandoc', [markdown, '-t', 'latex', `--lua-filter=${filter}`], { encoding: 'utf8' })
    // Relative column widths keep the table inside the A4 text column, and
    // zero-width break points keep long identifiers from overflowing it.
    assert.match(latex, /\\real\{0\.\d+\}/)
    assert.ok(latex.includes('\\hspace{0pt}'), 'long tokens keep their break points')
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
})

test('libraries WeasyPrint opens by name are staged once, under their unversioned alias', (t) => {
  if (process.platform === 'win32') return t.skip('needs POSIX symlinks')
  const { cffiLibraryName, createLibraryStore } = require('../../scripts/lib/macos-library-store.cjs')
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'doku-cffi-libraries-'))
  try {
    // Homebrew layout: one real file per library plus versioned/unversioned symlinks.
    const cellar = path.join(temp, 'Cellar/glib/lib')
    fs.mkdirSync(cellar, { recursive: true })
    const gobject = path.join(cellar, 'libgobject-2.0.0.dylib')
    fs.writeFileSync(gobject, 'gobject')
    fs.symlinkSync('libgobject-2.0.0.dylib', path.join(cellar, 'libgobject-2.0.dylib'))
    const glib = path.join(cellar, 'libglib-2.0.0.dylib')
    fs.writeFileSync(glib, 'glib')
    const harfbuzz = path.join(temp, 'Cellar/harfbuzz/lib/libharfbuzz.0.dylib')
    fs.mkdirSync(path.dirname(harfbuzz), { recursive: true })
    fs.writeFileSync(harfbuzz, 'homebrew harfbuzz')
    fs.symlinkSync('libharfbuzz.0.dylib', path.join(path.dirname(harfbuzz), 'libharfbuzz.dylib'))
    const pillow = path.join(temp, 'site-packages/PIL/.dylibs/libharfbuzz.0.dylib')
    fs.mkdirSync(path.dirname(pillow), { recursive: true })
    fs.writeFileSync(pillow, 'pillow harfbuzz')

    // ctypes.util.find_library("gobject-2.0") resolves libgobject-2.0.dylib.
    assert.equal(cffiLibraryName(gobject), 'libgobject-2.0.dylib')
    assert.equal(cffiLibraryName(harfbuzz), 'libharfbuzz.dylib')
    assert.equal(cffiLibraryName(glib), null)
    assert.equal(cffiLibraryName(pillow), null)

    const directory = path.join(temp, 'bundle/lib')
    const store = createLibraryStore(directory, cffiLibraryName)
    // Linked through a symlink or directly: one staged file, never an extra copy.
    assert.equal(store.stage(path.join(cellar, 'libgobject-2.0.dylib')), path.join(directory, 'libgobject-2.0.dylib'))
    assert.equal(store.stage(gobject), path.join(directory, 'libgobject-2.0.dylib'))
    assert.equal(store.stage(harfbuzz), path.join(directory, 'libharfbuzz.dylib'))
    assert.match(path.basename(store.stage(pillow)), /^[0-9a-f]{16}-libharfbuzz\.0\.dylib$/)
    assert.match(path.basename(store.stage(glib)), /^[0-9a-f]{16}-libglib-2\.0\.0\.dylib$/)
    assert.equal(fs.readFileSync(path.join(directory, 'libharfbuzz.dylib'), 'utf8'), 'homebrew harfbuzz')
    assert.deepEqual(fs.readdirSync(directory).filter((name) => name.includes('gobject')), ['libgobject-2.0.dylib'])

    // Two different libraries may never share a staged name.
    const clash = createLibraryStore(path.join(temp, 'clash'), () => 'libsame.dylib')
    clash.stage(gobject)
    assert.throws(() => clash.stage(glib), /Two libraries staged as/)
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
})

test('macOS library staging preserves colliding read-only libraries and supports reruns', () => {
  const { createLibraryStore, copyWritable } = require('../../scripts/lib/macos-library-store.cjs')
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'doku-macos-libraries-'))
  try {
    const sources = ['homebrew', 'pillow'].map((name) => {
      const file = path.join(temp, name, 'liblzma.5.dylib')
      fs.mkdirSync(path.dirname(file), { recursive: true })
      fs.writeFileSync(file, name, { mode: 0o444 })
      return file
    })
    const directory = path.join(temp, 'bundle/lib')
    const store = createLibraryStore(directory)
    const targets = sources.map(store.stage)
    assert.notEqual(targets[0], targets[1])
    for (let i = 0; i < sources.length; i++) {
      assert.equal(fs.readFileSync(targets[i], 'utf8'), i === 0 ? 'homebrew' : 'pillow')
      assert.equal(store.stage(sources[i]), targets[i])
      if (process.platform !== 'win32') {
        assert.equal(fs.statSync(sources[i]).mode & 0o777, 0o444)
        assert.equal(fs.statSync(targets[i]).mode & 0o777, 0o755)
      }
    }
    fs.chmodSync(targets[0], 0o444)
    assert.equal(createLibraryStore(directory).stage(sources[0]), targets[0])
    const alias = path.join(directory, 'liblzma.dylib')
    fs.writeFileSync(alias, 'stale', { mode: 0o444 })
    copyWritable(targets[0], alias)
    assert.equal(fs.readFileSync(alias, 'utf8'), 'homebrew')
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
})

test('version arithmetic and strict semver', () => {
  assert.equal(meta.bumpVersion('0.1.9'), '0.1.10')
  assert.equal(meta.bumpVersion('0.1.9', 'minor'), '0.2.0')
  assert.equal(meta.bumpVersion('0.1.9', 'major'), '1.0.0')
  assert.throws(() => meta.parseVersion('1.2.3-beta'), /not a plain/)
})

test('package transforms preserve Doku identity and synchronize versions', () => {
  const desktop = JSON.parse(bump.updatePackageJson(JSON.stringify({ name: 'doku-desktop', version: '0.1.4', build: { artifactName: 'old', appImage: {}, portable: {} } }), '0.1.5', true))
  assert.equal(desktop.name, 'doku-desktop')
  assert.equal(desktop.build.artifactName, 'doku_v${version}.${ext}')
  assert.equal(desktop.build.appImage.artifactName, 'doku_v${version}.${ext}')
  const lock = JSON.parse(bump.updatePackageLock(JSON.stringify({ version: '0.1.4', packages: { '': { version: '0.1.4' }, 'apps/desktop': { version: '0.1.4' } } }), '0.1.5'))
  assert.equal(lock.packages[''].version, '0.1.5')
  assert.equal(lock.packages['apps/desktop'].version, '0.1.5')
})

test('changelog parsing, wrapping and deterministic gzip', () => {
  assert.deepEqual(meta.parseEntries('### Added\n- Uno\n  continua\n\n### Fixed\n- Due'), ['Added: Uno continua', 'Fixed: Due'])
  assert.ok(meta.wrapEntry('parola '.repeat(30)).split('\n').every((line) => line.length <= 76))
  const a = deb.gzipDeterministic('Doku\n'); const b = deb.gzipDeterministic('Doku\n')
  assert.deepEqual(a, b); assert.equal(zlib.gunzipSync(a).toString(), 'Doku\n')
})

test('Debian control is canonical and lossless', () => {
  const normalized = deb.normalizeDescription('Your Second Mind\n  Private local-first workspace.')
  assert.equal(normalized, 'Your Second Mind\n Private local-first workspace.')
  const fields = deb.parseControl('Vendor: x\nDescription: Your Second Mind\n body\nPackage: doku\n')
  const rendered = deb.renderControl(fields)
  assert.ok(rendered.indexOf('Package:') < rendered.indexOf('Description:'))
  assert.ok(rendered.endsWith('Description: Your Second Mind\n body\n'))
})

test('repository packaging invariants hold', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-packaging-assets.js'], { cwd: meta.paths.repoRoot, encoding: 'utf8' })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
})

test('version dry-run performs no writes', () => {
  const before = [meta.paths.packageJson, meta.paths.desktopPackageJson, meta.paths.packageLock, meta.paths.changelogMd, meta.paths.releaseHistory].map((file) => fs.readFileSync(file))
  bump.run(['--no-bump', '--dry-run'])
  const after = [meta.paths.packageJson, meta.paths.desktopPackageJson, meta.paths.packageLock, meta.paths.changelogMd, meta.paths.releaseHistory].map((file) => fs.readFileSync(file))
  assert.deepEqual(after, before)
})

test('synthetic FPM-shaped deb is finalized end-to-end', { skip: !has('fakeroot') || !has('dpkg-deb') || !has('dpkg-parsechangelog') }, () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'doku-packaging-e2e-'))
  const root = path.join(temp, 'root'); const artifact = path.join(temp, 'doku.deb')
  try {
    fs.mkdirSync(path.join(root, 'DEBIAN'), { recursive: true })
    fs.mkdirSync(path.join(root, 'opt', 'Doku'), { recursive: true })
    fs.mkdirSync(path.join(root, 'usr', 'share', 'doc', 'doku'), { recursive: true })
    fs.writeFileSync(path.join(root, 'DEBIAN', 'control'), 'Package: doku\nVersion: 0.1.4\nSection: default\nPriority: optional\nArchitecture: amd64\nMaintainer: Lorenzo DM <commercial.lorenzodm@gmail.com>\nLicense: AGPL\nVendor: Doku\nDescription: Your Second Mind\n')
    fs.writeFileSync(path.join(root, 'opt', 'Doku', 'doku'), '#!/bin/sh\n', { mode: 0o775 })
    fs.writeFileSync(path.join(root, 'opt', 'Doku', 'libdemo.so'), 'x', { mode: 0o775 })
    fs.writeFileSync(path.join(root, 'opt', 'Doku', 'ld-linux-x86-64.so.2'), 'x', { mode: 0o755 })
    fs.writeFileSync(path.join(root, 'usr', 'share', 'doc', 'doku', 'LICENSE'), 'stale', { mode: 0o444 })
    execFileSync('fakeroot', ['dpkg-deb', '--build', root, artifact], { stdio: 'ignore' })
    execFileSync('fakeroot', [process.execPath, 'scripts/deb-finalize.js', artifact], { cwd: meta.paths.repoRoot, stdio: 'inherit' })
    const control = execFileSync('dpkg-deb', ['-f', artifact], { encoding: 'utf8' })
    assert.match(control, /^Section: misc$/m); assert.doesNotMatch(control, /^(License|Vendor):/m)
    const list = execFileSync('dpkg-deb', ['-c', artifact], { encoding: 'utf8' })
    assert.match(list, /usr\/share\/doc\/doku\/changelog\.gz/)
    assert.match(list, /usr\/share\/doc\/doku\/copyright/)
    assert.match(list, /usr\/share\/pixmaps\/doku\.png/)
    assert.match(list, /etc\/xdg\/autostart\/doku\.desktop/)
    assert.doesNotMatch(list, /usr\/share\/doc\/doku\/LICENSE/)
    const extracted = path.join(temp, 'extracted'); execFileSync('dpkg-deb', ['-R', artifact, extracted])
    assert.equal(fs.statSync(path.join(extracted, 'opt/Doku/ld-linux-x86-64.so.2')).mode & 0o777, 0o755)
    const changelog = zlib.gunzipSync(fs.readFileSync(path.join(extracted, 'usr/share/doc/doku/changelog.gz')))
    const parsed = execFileSync('dpkg-parsechangelog', ['-l', '-'], { input: changelog, encoding: 'utf8' })
    const releaseVersion = meta.readJson(meta.paths.desktopPackageJson).version
    assert.equal(deb.parseControl(control).get('Version'), releaseVersion)
    assert.equal(parsed.match(/^Version: (.+)$/m)?.[1], releaseVersion)
    execFileSync('md5sum', ['-c', '--quiet', path.join(extracted, 'DEBIAN/md5sums')], { cwd: extracted })
    const firstPayload = crypto.createHash('sha256').update(changelog).digest('hex')
    execFileSync('fakeroot', [process.execPath, 'scripts/deb-finalize.js', artifact], { cwd: meta.paths.repoRoot, stdio: 'ignore' })
    const second = path.join(temp, 'second'); execFileSync('dpkg-deb', ['-R', artifact, second])
    const secondChangelog = zlib.gunzipSync(fs.readFileSync(path.join(second, 'usr/share/doc/doku/changelog.gz')))
    assert.equal(crypto.createHash('sha256').update(secondChangelog).digest('hex'), firstPayload)
    execFileSync('md5sum', ['-c', '--quiet', path.join(second, 'DEBIAN/md5sums')], { cwd: second })
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
})


test('packaging rejects an incomplete export runtime', () => {
  const { verifyExportRuntime } = require('../../scripts/verify-export-runtime.cjs')
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'doku-missing-runtime-'))
  try {
    assert.throws(() => verifyExportRuntime(temp, 'win32'), /Bundled export runtime incomplete/)
    assert.throws(() => verifyExportRuntime(temp, 'linux'), /Bundled Python standard library missing/)
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
})


test('fresh checkout passes repository checks but cannot package without compiled output', () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'doku-clean-checkout-'))
  try {
    for (const file of ['package.json', 'package-lock.json', 'CHANGELOG.md',
      'apps/desktop/package.json', 'scripts/release-history.json',
      'scripts/lib/release-meta.js', 'scripts/verify-packaging-assets.js',
      'apps/desktop/src/assets/icon.png', 'apps/desktop/src/assets/icon.ico',
      'apps/desktop/src/assets/icon.icns', 'packages/ui/src/icons/bootstrapIcons.generated.ts']) {
      const target = path.join(temp, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(path.join(meta.paths.repoRoot, file), target)
    }
    const check = (args = []) => spawnSync(process.execPath,
      ['scripts/verify-packaging-assets.js', ...args], { cwd: temp, encoding: 'utf8' })
    const repository = check()
    assert.equal(repository.status, 0, repository.stderr)
    const desktopPath = path.join(temp, 'apps/desktop/package.json')
    const desktopSource = fs.readFileSync(desktopPath, 'utf8')
    for (const invalid of [{ depends: [] }, { depends: ['python3'], fpm: ['--no-rpm-autoreqprov'] },
      { depends: [], fpm: ['--no-rpm-autoreqprov', '--rpm-autoreq'] }]) {
      const desktop = JSON.parse(desktopSource)
      desktop.build.rpm = invalid
      fs.writeFileSync(desktopPath, JSON.stringify(desktop))
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /RPM must disable/)
    }
    // Windows must ship the NSIS installer plus the extract-and-run archive; the NSIS
    // portable self-extractor (multi-GB extraction on every launch) is rejected.
    for (const win of [{ target: ['portable'], artifactName: 'doku_v${version}-portable.${ext}' },
      { target: ['nsis'], artifactName: 'doku_v${version}-portable.${ext}' },
      { target: ['nsis', 'zip', 'portable'], artifactName: 'doku_v${version}-portable.${ext}' }]) {
      const desktop = JSON.parse(desktopSource)
      desktop.build.win = win
      fs.writeFileSync(desktopPath, JSON.stringify(desktop))
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /Windows targets must be exactly nsis \+ zip/)
    }
    {
      const desktop = JSON.parse(desktopSource)
      desktop.dependencies = { 'bootstrap-icons': '1.13.1' }
      fs.writeFileSync(desktopPath, JSON.stringify(desktop))
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /bootstrap-icons must not be a runtime dependency/)
    }
    for (const compression of [undefined, 'xz', 'xzmt']) {
      const desktop = JSON.parse(desktopSource)
      desktop.build.rpm.compression = compression
      fs.writeFileSync(desktopPath, JSON.stringify(desktop))
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /RPM compression must be gzip/)
    }
    fs.writeFileSync(desktopPath, desktopSource)
    const unbuilt = check(['--require-build'])
    assert.equal(unbuilt.status, 1)
    for (const entry of ['main/index.js', 'preload/index.js', 'renderer/index.html']) {
      assert.ok(unbuilt.stderr.includes(`apps/desktop/out/${entry}`))
      const target = path.join(temp, 'apps/desktop/out', entry)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, 'compiled fixture')
    }
    const built = check(['--require-build'])
    assert.equal(built.status, 0, built.stderr)
    fs.unlinkSync(path.join(temp, 'apps/desktop/src/assets/icon.ico'))
    const missingIcon = check()
    assert.equal(missingIcon.status, 1)
    assert.match(missingIcon.stderr, /icon\.ico/)
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
})
