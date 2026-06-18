# browser-extension — deferred to V1.1

Not part of the V1 MVP. Tracked here so the decision to defer is visible,
not silent.

When built, this package must follow `docs/browser-extension-policy.md`
exactly: a manual helper (copy / insert / create handoff / view receipt),
never a background observer, never a silent auto-injector, never an account
connector.

Planned shape (per the source design):
```
browser-extension/
├── manifest.json
├── popup.tsx
└── content-script.ts
```

None of these files exist yet. `packages/core` and `packages/cli` must ship
and be used first.
