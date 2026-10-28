# vault-logseq

Reduced Logseq graph written by hand in Logseq's on-disk format, for the
importer and the outliner (PLAN Part 2, K5, K6, K15). It reproduces what a real
graph contains: `logseq/config.edn`, `journals/YYYY_MM_DD.md`, `pages/` with
`___` namespace separators, `key:: value` properties, block `id::`, block
references `((uuid))`, embeds, task markers, SCHEDULED / DEADLINE, `#card` and
`{{cloze}}`. Each file opens with a `fixture::` property saying what it tests.
