function parseDependencies(output) {
  // Universal binaries repeat an unindented header for every architecture.
  // Only library records carry the compatibility/current version suffix.
  return [...new Set(output.split('\n').flatMap((line) => {
    const match = line.match(/^\s+(.+?)\s+\(compatibility version [^)]*\)\s*$/);
    return match ? [match[1]] : [];
  }))];
}
module.exports = { parseDependencies };
