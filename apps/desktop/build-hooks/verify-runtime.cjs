const { ensureBuildTmpdir } = require('../../../scripts/lib/build-tmpdir.cjs');
const runtime = require('../../../scripts/verify-export-runtime.cjs');

// beforePack runs inside the electron-builder process, so the temporary
// directory chosen here is the one fpm and rpmbuild inherit later.
module.exports = async function (context) {
  ensureBuildTmpdir();
  return runtime.default(context);
};
