# vault-small

Hand-written fixture vault for the Doku v2 sprints (PLAN Part 2, K0.3).
Every note starts with a `fixture:` property that says what it exercises.

| Folder | What it covers |
|---|---|
| `journals/` | daily notes, tasks with markers, priorities, SCHEDULED / DEADLINE (K6) |
| `pages/` | links, aliases, ambiguous names, headings, block ids, properties, tags (K2, K4, K5) |
| `projects/` | namespaced pages and queries (K4, K7) |
| `templates/` | templates with variables (K8) |
| `cards/` | flashcards and clozes (K10) |
| `canvas/` | a JSON Canvas board (K11) |
| `assets/` | an image and a one-page PDF (K12) |

Counts the tests rely on: 30 Markdown notes besides this README, 3 unresolved
links (`Missing Page One/Two/Three`), 2 notes named `Meeting` (ambiguous link
target), 1 orphan (`Orphan.md`), 1 canvas, 1 PDF, 1 image.
