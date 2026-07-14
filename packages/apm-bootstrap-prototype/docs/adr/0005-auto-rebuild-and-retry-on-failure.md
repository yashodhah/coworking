# Mid-session apm failure triggers an automatic rebuild-and-retry-once

When an `apm` invocation fails unexpectedly during normal use (Section 9.3), the extension automatically re-runs Provisioning, and if that succeeds, retries the original failed operation exactly once before surfacing an error. It does not fail immediately and leave rebuilding for "next time," and it does not retry in a loop.

This was chosen over failing immediately because, combined with hiding apm's identity from the user (ADR 0003), a bare error on first failure would be confusing and unactionable to a general user who doesn't know a rebuildable environment is involved — a transparent self-heal-then-retry gives the original action a real chance to just succeed. Capping retries at exactly one avoids masking a genuinely broken `apm-cli` release or a persistent environment problem behind an infinite retry loop.
