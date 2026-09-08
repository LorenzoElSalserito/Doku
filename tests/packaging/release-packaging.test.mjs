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
      'apps/desktop/src/assets/icon.icns']) {
      const target = path.join(temp, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(path.join(meta.paths.repoRoot, file), target)
    }
    const check = (args = []) => spawnSync(process.execPath,
      ['scripts/verify-packaging-assets.js', ...args], { cwd: temp, encoding: 'utf8' })
    const repository = check()
    assert.equal(repository.status, 0, repository.stderr)
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
