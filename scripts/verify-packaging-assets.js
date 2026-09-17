#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const meta = require('./lib/release-meta')

const root = meta.readJson(meta.paths.packageJson)
const desktop = meta.readJson(meta.paths.desktopPackageJson)
const lock = meta.readJson(meta.paths.packageLock)
const problems = []
const rpm = desktop.build?.rpm
if (rpm?.compression !== 'gzip') problems.push('RPM compression must be gzip to avoid unbounded xzmt memory usage')
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
// Windows: one-time NSIS installer plus an extract-and-run archive. The NSIS "portable" self-extractor
// unpacked the multi-GB PDF runtime into %TEMP% on every launch and looked like it never started.
const winTargets = Array.isArray(desktop.build?.win?.target) ? desktop.build.win.target.map((t) => (typeof t === 'string' ? t : t?.target)) : []
if (!winTargets.includes('nsis') || !winTargets.includes('zip') || winTargets.includes('portable')) problems.push('Windows targets must be exactly nsis + zip (no NSIS portable self-extractor)')
if (desktop.build?.win?.artifactName !== 'doku_v${version}-portable.${ext}') problems.push('win.artifactName must be literal doku_v${version}-portable.${ext}')
if (desktop.build?.nsis?.artifactName !== 'doku_v${version}-setup.${ext}') problems.push('nsis.artifactName must be literal doku_v${version}-setup.${ext}')
if (desktop.build?.nsis?.oneClick !== false || desktop.build?.nsis?.perMachine !== false) problems.push('NSIS installer must be per-user and assisted (oneClick: false, perMachine: false)')
// Icons are embedded from bootstrap-icons at build time: it must stay a devDependency, never a runtime one.
for (const [name, pkg] of [['root', root], ['desktop', desktop]]) {
  if (pkg.dependencies?.['bootstrap-icons']) problems.push(`bootstrap-icons must not be a runtime dependency (${name})`)
}
if (!root.devDependencies?.['bootstrap-icons']) problems.push('bootstrap-icons devDependency missing (icon registry generator)')
if (!fs.existsSync(path.join(meta.paths.repoRoot, 'packages/ui/src/icons/bootstrapIcons.generated.ts'))) problems.push('embedded icon registry missing: run npm run icons:bootstrap')
if (!meta.readHistory().releases.some((release) => release.version === root.version)) problems.push(`release-history.json has no ${root.version}`)
if (!meta.readChangelog().includes(`## [${root.version}]`)) problems.push(`CHANGELOG.md has no ${root.version}`)
if (missing.length) problems.push(`missing assets: ${missing.join(', ')}`)
if (process.argv.includes('--require-build') && missing.length === 0) {
  // The renderer must be self-contained: no CDN scripts, stylesheets or icon fonts.
  const rendererDir = path.join(meta.paths.repoRoot, 'apps/desktop/out/renderer')
  const external = []
  const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else if (/\.(html|css)$/.test(entry.name)) { const text = fs.readFileSync(file, 'utf8'); for (const match of text.matchAll(/(?:src|href)=["'](https?:)?\/\/[^"']+["']|@import\s+(?:url\()?["']?https?:\/\/[^"')]+/g)) external.push(`${path.relative(meta.paths.repoRoot, file)}: ${match[0]}`) } } }
  walk(rendererDir)
  if (external.length) problems.push(`renderer references external resources: ${external.join('; ')}`)
}
if (problems.length) { console.error('[verify-packaging-assets] Packaging inconsistent:'); for (const problem of problems) console.error(`  - ${problem}`); process.exit(1) }
console.log(`[verify-packaging-assets] Packaging coherent (Doku ${root.version}).`)
