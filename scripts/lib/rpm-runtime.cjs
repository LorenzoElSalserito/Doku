const { execFileSync } = require('node:child_process');

function verifyRequirements(requirements) {
  // /bin/sh runs installer scriptlets; rpmlib capabilities belong to RPM itself.
  const external = requirements.filter((entry) => entry !== '/bin/sh' && !entry.startsWith('rpmlib('));
  if (external.length) throw new Error(`RPM contains external runtime requirements:\n${external.join('\n')}`);
}

function certifyRpm(file) {
  const output = execFileSync('rpm', ['-qpR', '--dbpath', '/tmp/doku-rpmdb', file], { encoding: 'utf8' });
  verifyRequirements(output.trim().split('\n').filter(Boolean));
}

module.exports = { verifyRequirements, certifyRpm };
