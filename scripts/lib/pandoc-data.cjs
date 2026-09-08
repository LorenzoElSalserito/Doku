const fs = require('node:fs/promises');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

async function preparePandocData(source, destination) {
  await fs.mkdir(destination, { recursive: true });
  if (existsSync(source)) {
    await fs.cp(source, destination, { recursive: true, dereference: true });
  }
  // File-based packagers omit empty directories. Keep --data-dir available
  // when Pandoc supplies its defaults from the executable instead of disk.
  await fs.writeFile(join(destination, 'README.doku.txt'),
    'Directory dati Pandoc di Doku. I dati esterni, quando disponibili, sono copiati qui.\n' +
    'In loro assenza il binario deve incorporare i dati predefiniti.\n' +
    'Gli export HTML e PDF del pacchetto vengono verificati dagli smoke test.\n');
}
module.exports = { preparePandocData };
