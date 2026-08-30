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
    const changelog = zlib.gunzipSync(fs.readFileSync(path.join(extracted, 'usr/share/doc/doku/changelog.gz')))
    const parsed = execFileSync('dpkg-parsechangelog', ['-l', '-'], { input: changelog, encoding: 'utf8' })
    assert.match(parsed, /^Version: 0\.1\.4$/m)
    execFileSync('md5sum', ['-c', '--quiet', path.join(extracted, 'DEBIAN/md5sums')], { cwd: extracted })
    const firstPayload = crypto.createHash('sha256').update(changelog).digest('hex')
    execFileSync('fakeroot', [process.execPath, 'scripts/deb-finalize.js', artifact], { cwd: meta.paths.repoRoot, stdio: 'ignore' })
    const second = path.join(temp, 'second'); execFileSync('dpkg-deb', ['-R', artifact, second])
    const secondChangelog = zlib.gunzipSync(fs.readFileSync(path.join(second, 'usr/share/doc/doku/changelog.gz')))
    assert.equal(crypto.createHash('sha256').update(secondChangelog).digest('hex'), firstPayload)
    execFileSync('md5sum', ['-c', '--quiet', path.join(second, 'DEBIAN/md5sums')], { cwd: second })
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
})
