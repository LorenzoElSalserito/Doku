const { join } = require('node:path');
const { verifyExportRuntime } = require('./verify-export-runtime.cjs');
const { certifyExportRuntime } = require('./lib/smoke-export-runtime.cjs');

exports.default = async (context) => {
  const resources = context.electronPlatformName === 'darwin'
    ? join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, 'Contents/Resources')
    : join(context.appOutDir, 'resources');
  const runtime = join(resources, 'export-runtime');
  verifyExportRuntime(runtime, context.electronPlatformName);
  certifyExportRuntime(runtime);
};
