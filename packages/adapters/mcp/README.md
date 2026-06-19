# adapters/mcp — deferred to V3

Planned role: expose the local vault (read-only, scoped) to MCP-compatible
tools, so an assistant could request a context pack through MCP instead of
the user pasting it manually.

**Deliberately not built yet.** Exposing the vault before scopes and
per-target permissions are battle-tested through the CLI risks the failure
mode named directly in the source design: "any AI can read the vault."
MCP support must arrive after the CLI's scope filtering
(`packages/core/scopes.ts`) and the external transport contract have real
usage behind them, not before.

No code, no schema, no endpoint here in V1.
