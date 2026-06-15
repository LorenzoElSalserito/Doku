#!/usr/bin/env node

// Generates the Debian documentation files (copyright + README) that are placed
// into /usr/share/doc/doku/ inside the .deb package. The destinations are wired
// up through the electron-builder `linux.deb.fpm` option in
// apps/desktop/package.json.

const fs = require('node:fs');
const { join } = require('node:path');

const rootDir = join(__dirname, '..');
const outDir = join(rootDir, 'build/deb-docs');

const rootPkg = JSON.parse(fs.readFileSync(join(rootDir, 'package.json'), 'utf8'));

const PACKAGE_NAME = 'doku';
const UPSTREAM_NAME = rootPkg.productName || 'Doku';
const SOURCE_URL = 'https://github.com/LorenzoElSalserito/Doku';
const COPYRIGHT_HOLDER = 'Lorenzo DM <commercial.lorenzodm@gmail.com>';
const COPYRIGHT_YEARS = '2024-2026';

// Machine-readable copyright file (DEP-5). Debian Policy §12.5 makes the
// copyright file mandatory; the AGPL-3 full text is shipped on Debian systems
// at /usr/share/common-licenses/AGPL-3.
const copyright = `Format: https://www.debian.org/doc/packaging-manuals/copyright-format/1.0/
Upstream-Name: ${UPSTREAM_NAME}
Upstream-Contact: ${COPYRIGHT_HOLDER}
Source: ${SOURCE_URL}

Files: *
Copyright: ${COPYRIGHT_YEARS} ${COPYRIGHT_HOLDER}
License: AGPL-3.0-only
 This program is free software: you can redistribute it and/or modify it
 under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, version 3 of the License.
 .
 This program is distributed in the hope that it will be useful, but
 WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
 License for more details.
 .
 You should have received a copy of the GNU Affero General Public License
 along with this program. If not, see <https://www.gnu.org/licenses/>.
 .
 On Debian systems, the complete text of the GNU Affero General Public
 License version 3 can be found in "/usr/share/common-licenses/AGPL-3".
`;

function main() {
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(join(outDir, 'copyright'), copyright, 'utf8');

  // Ship the upstream README as the package documentation.
  fs.copyFileSync(join(rootDir, 'README.md'), join(outDir, 'README.md'));

  console.log(`Debian docs prepared in ${outDir} (copyright, README.md).`);
}

main();
