function parseDependencies(output) {
  // Universal binaries repeat an unindented header for every architecture.
  // Only library records carry the compatibility/current version suffix.
  return [...new Set(output.split('\n').flatMap((line) => {
    const match = line.match(/^\s+(.+?)\s+\(compatibility version [^)]*\)\s*$/);
    return match ? [match[1]] : [];
  }))];
}

// `otool -D` prints a header per architecture ending in ':' followed by the
// dylib's own install name (LC_ID_DYLIB); executables have headers only.
function parseInstallNames(output) {
  return [...new Set(output.split('\n').map((line) => line.trim())
    .filter((line) => line && !line.endsWith(':')))];
}
module.exports = { parseDependencies, parseInstallNames };
