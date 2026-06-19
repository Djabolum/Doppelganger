# Field Cases

These cases are deliberately ordinary. V1.1 is proven by repeated human use,
not by adding another abstract layer.

## 1. General response style

```bash
doppel card add memory \
  --label "Response style" \
  --content "Answer in layers and name uncertainty directly."
doppel context build --scope minimal --target chatgpt
```

## 2. A boundary without personal history

```bash
doppel card add boundary \
  --label "No diagnosis" \
  --content "turn my emotions or traces into a diagnosis"
doppel context build --scope minimal --target claude
```

## 3. One project, no global preferences

```bash
doppel card add project \
  --label "Doppelganger V1.1" \
  --content "Field hardening before any real network intake."
doppel context build --scope project --target gemini --format markdown
```

## 4. Machine-readable project export

```bash
doppel context build \
  --scope project \
  --target generic \
  --format json \
  --out ./doppelganger-project.json
```

## 5. Cross-assistant handoff

```bash
doppel handoff create \
  --topic "Quark Intake Contract" \
  --from chatgpt \
  --to claude \
  --decision "Continuity must enter quarantine, not active memory." \
  --open-question "What proves bilateral receipt agreement?" \
  --boundary "Do not map continuity directly to /fossils."

doppel handoff export --id <handoff_id> --format markdown
```

## 6. Structural signal only

```bash
doppel card add fossil --label "Layered response pattern"
doppel context build --scope fossil_only --target quark-ai --format json
```

## 7. Inspect exactly what Quark would receive

```bash
doppel quark dry-run --type handoff --id <handoff_id>
```

No network call is made.

## 8. Audit and revoke

```bash
doppel receipt list
doppel receipt show --id <receipt_id>
doppel card revoke --id <card_id> --reason "Superseded"
doppel doctor
```

Local revocation prevents future vault exports. It does not claim remote
recall of copies already shared.
