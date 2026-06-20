# Markdown Card Import — Draft Boundary

Status: **design draft, not implemented**.

Markdown import is a local writing convenience. It is not a Notion
integration and does not make arbitrary document content a valid continuity
object.

## Intended command

```bash
doppel card import --from markdown --file ./examples/notion-like/cards.md --dry-run
doppel card import --from markdown --file ./examples/notion-like/cards.md
```

`--dry-run` must show the canonical cards that would be created and every
validation error without writing to the vault.

`--from markdown` names the input parser explicitly. A future official
Notion adapter must use its own source name and still pass through the same
canonicalization boundary.

## Minimal authored format

```markdown
---
kind: memory
label: Response style
sensitivity: normal
deep_allowed: false
---

Answer in layers and avoid generic replies.
```

Allowed authored fields:

- `kind`: `memory`, `boundary`, or `project`
- `label`: a non-empty human-readable title
- `sensitivity`: `public`, `normal`, or `sensitive`
- `deep_allowed`: `true` or `false`
- Markdown body: card content

Fossil traces and handoff cards require distinct structures and must not be
smuggled through this generic format.

## CLI kind vocabulary

The short CLI vocabulary remains:

```text
doppel card add <memory|boundary|project|fossil> --label <label> [--content <text>] [--sensitivity public|normal|sensitive] [--deep-allowed]
```

`fossil` is only a user-facing alias. It must resolve to:

```text
kind = fossil_trace
```

There is no `fossil_card` object. Although the general command synopsis
shows the optional `--content` flag, policy rejects it when the selected
kind is `fossil`; a fossil trace carries only a short structural pattern
label, never narrative content.

```bash
doppel card add fossil --label "Trace de passage"
```

## Canonicalization boundary

The importer must never deserialize a Markdown file directly into the vault.
It parses authored input, validates it, and then uses Doppelganger's normal
card constructor and policy chokepoint.

Doppelganger alone generates:

- canonical `kind`
- card ID
- `authority: false`
- `revocable: true`
- creation and update timestamps

Authored IDs, authority flags, receipt fields, timestamps, unknown front
matter, and executable or embedded remote content must be rejected rather
than silently trusted.

## Notion-like sources

A user may export a page or database entry as Markdown and place the result
in `cards/`. That compatibility does not authorize Doppelganger to:

- connect to a Notion account
- synchronize in the background
- import an entire workspace
- treat page properties as policy
- export raw notes to another system

The invariant is:

> Writing content is input to validation, not continuity authority.
