# Browser Extension Policy

Deferred to V3 (`packages/browser-extension/README.md`). This policy is
written now, before any code, so the constraint exists before the
temptation does.

## The one-sentence rule

The extension helps the user move context manually. It does not watch the
user move through AI surfaces.

## What the user should feel

> I'm holding the wheel.

Not:

> A module is watching what I do.

## Allowed actions

- Copy a context pack to the clipboard.
- Insert a context pack into the current page's text field, on explicit
  click.
- Create a handoff card from text the user selected and provided.
- Show what would be exported before exporting it.

UI vocabulary for these: `Prepare context`, `Copy`, `Insert`,
`Create handoff`, `View receipt`.

## Forbidden actions

- Reading all conversations automatically.
- Watching AI pages in the background.
- Collecting which AI accounts are connected.
- Uploading anything without an explicit user action for that specific
  upload.
- Injecting context silently, without the user seeing what was inserted.

UI vocabulary that must never appear: `Sync all my AI accounts`,
or any wording implying continuous, unattended operation.

## Manifest constraints (when this is built)

- No `background` service worker that polls or watches tabs on a schedule.
- No host permissions beyond the specific AI surfaces the user opts into.
- No silent network requests — every request must be traceable to a click.
- Every export must still go through `packages/core/receipts.ts` so a
  receipt exists, exactly as the CLI does.

## Relationship to the CLI

The extension is a thin UI on top of the same vault and the same
`packages/core` policy checks the CLI already uses. It must not duplicate
the scope-filtering or policy logic — it calls into the same core, or it
does not ship.
