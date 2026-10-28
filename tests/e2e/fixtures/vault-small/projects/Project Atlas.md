---
fixture: "Project page with milestones heading and a doku-query block (K7 queries)."
type: project
status: active
owner: "[[Alice Rossi]]"
due: 2026-12-15
---

# Project Atlas

A local first knowledge base.

## Milestones

- [ ] Index the vault
- [ ] Ship backlinks

```doku-query
from: pages
where:
  type: person
view: table
columns: [title, role]
```
