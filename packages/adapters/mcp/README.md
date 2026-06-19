# adapters/mcp — deferred beyond V1 MVP

Planned role: expose the local vault (read-only, scoped) to MCP-compatible
tools, so an assistant could request a context pack through MCP instead of
the user pasting it manually.

**Deliberately not built yet.** Exposing the vault before scopes and
per-target permissions are battle-tested through the CLI risks the failure
mode named directly in the source design: "any AI can read the vault."
MCP support must arrive after the CLI's scope filtering
(`packages/core/scopes.ts`) has real usage behind it, not before.

No code, no schema, no endpoint here in V1.
