# Doppelganger Candidate 0.3 Dry-run Builder V0

Status: **local-only, file-only, no transport**.

The builder creates a bounded candidate 0.3 continuity deposit from an
existing `handoff_card` or `fossil_trace`. It does not send, queue, upload,
or register the candidate anywhere.

The builder depends on the local Contract Doctor. The Doctor does not depend
on the builder.

## Command

```bash
doppel contract build-quark-candidate \
  --type handoff \
  --id hnd_... \
  --out ./dist/quark-candidate.json \
  --confirm
```

`--type fossil` accepts only a validated `fossil_trace`. Memory, boundary,
and project cards are not candidate 0.3 payload kinds.

`--retention-days <1-30>` is optional and defaults to 30.

## Mandatory gates

Before loading the selected artifact or creating an output directory, the
command runs the Contract Doctor and requires:

- `status: healthy`
- every Doctor check to pass
- `network_authorized: false`
- the locked candidate 0.3 Contract ID
- payload schema version `0.3`

Drift, an unknown Contract ID, an authorization change, malformed Doctor
output, or a Doctor execution failure blocks the build before files are
written.

`--confirm` approves only the exact bounded projection written to the local
candidate file. It is not transport consent and grants no future capability.

## Local outputs

The selected `--out` path receives the candidate `continuity_deposit`.
A sibling `<name>.manifest.json` file records:

- Contract ID and fixture version
- candidate payload kind and schema version
- canonical artifact hash and byte size
- SHA-256 of the written candidate file
- `network_authorized: false`
- explicit absence of an HTTP client, endpoint, credential, and send event

Both files use private local file permissions where the operating system
supports them.

## Explicitly absent

- no Quark adapter
- no HTTP client or endpoint
- no credential loading or inclusion
- no route or runtime activation
- no quarantine write
- no server receipt
- no live deposit

The output may be passed manually to the Quark local validator for contract
testing. That local validation does not authorize transport.
