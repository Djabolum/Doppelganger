# Public Documentation Policy

Doppelganger is a public repository. Its documentation explains product
contracts and user-verifiable guarantees, not private deployment topology.

## Public by design

- product doctrine and invariants
- CLI behavior
- versioned public schemas
- proposed public protocol contracts
- examples containing synthetic ids and content
- security boundaries users need to evaluate the product

## Not public

- filesystem paths from a maintainer's machine or server
- private domains, IP addresses, ports, process names, or deployment commands
- internal service topology or dependency maps
- credentials, secret names tied to a deployment, or environment dumps
- incident logs, customer data, or private repository findings
- explanations of how private systems currently implement their internals

## Writing rule

Describe:

> The receiving system must validate the continuity policy.

Do not describe:

> Which private service, host, port, process, or file currently performs that
> validation.

The public contract should remain implementable by another system without
revealing how any current deployment is assembled.

## Automated guard

`npm test` includes a public-surface scan. It rejects known private path,
network, topology, and operator vocabulary in tracked documentation and
examples. This is a guardrail, not a substitute for human review.
