#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const meta = require('./lib/release-meta')

const root = meta.readJson(meta.paths.packageJson)
const desktop = meta.readJson(meta.paths.desktopPackageJson)
const lock = meta.readJson(meta.paths.packageLock)
const problems = []
const rpm = desktop.build?.rpm
if (!Array.isArray(rpm?.depends) || rpm.depends.length !== 0 ||
    !rpm?.fpm?.includes('--no-rpm-autoreqprov') ||
    rpm.fpm.some((arg) => /^--rpm-auto(req|prov)/.test(arg))) {
  problems.push('RPM must disable automatic runtime dependencies and declare depends: []')
}
// Repository checks run before compilation on a fresh CI checkout.
const required = ['apps/desktop/src/assets/icon.png', 'apps/desktop/src/assets/icon.ico', 'apps/desktop/src/assets/icon.icns']
if (process.argv.includes('--require-build')) required.push('apps/desktop/out/main/index.js', 'apps/desktop/out/preload/index.js', 'apps/desktop/out/renderer/index.html')
const missing = required.filter((file) => !fs.existsSync(path.join(meta.paths.repoRoot, file)))
if (root.name !== 'doku' || desktop.name !== 'doku-desktop') problems.push('npm identity must remain doku / doku-desktop')
if (root.productName !== 'Doku' || desktop.productName !== 'Doku') problems.push('productName must remain Doku')
if (root.version !== desktop.version || lock.version !== root.version || lock.packages?.['']?.version !== root.version || lock.packages?.['apps/desktop']?.version !== root.version) problems.push('root, desktop and lock versions differ')
if (desktop.build?.artifactName !== 'doku_v${version}.${ext}') problems.push('build.artifactName must be literal doku_v${version}.${ext}')
if (desktop.build?.afterAllArtifactBuild !== 'build-hooks/finalize-artifacts.cjs') problems.push('afterAllArtifactBuild hook missing')
if (desktop.build?.beforePack !== 'build-hooks/verify-runtime.cjs') problems.push('beforePack runtime guard missing')
if (desktop.build?.afterPack !== 'build-hooks/certify-runtime.cjs') problems.push('afterPack runtime certification missing')
if (desktop.build?.linux?.executableName !== 'doku' || desktop.build?.deb?.packageName !== 'doku') problems.push('Linux identity must remain doku')
if (desktop.build?.deb?.packageCategory !== 'misc' || desktop.build?.deb?.priority !== 'optional') problems.push('Debian category/priority inconsistent')
if (!meta.readHistory().releases.some((release) => release.version === root.version)) problems.push(`release-history.json has no ${root.version}`)
if (!meta.readChangelog().includes(`## [${root.version}]`)) problems.push(`CHANGELOG.md has no ${root.version}`)
if (missing.length) problems.push(`missing assets: ${missing.join(', ')}`)
if (problems.length) { console.error('[verify-packaging-assets] Packaging inconsistent:'); for (const problem of problems) console.error(`  - ${problem}`); process.exit(1) }
console.log(`[verify-packaging-assets] Packaging coherent (Doku ${root.version}).`)
