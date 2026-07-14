# pip install inherits the user's existing proxy/mirror config

`pip install apm-cli==<pinned>` is run as a plain pip invocation that inherits whatever proxy or index configuration is already present on the machine (pip.conf, environment variables like `PIP_INDEX_URL`), rather than forcing an explicit `--index-url` at the real public PyPI.

This is a deliberate reading of Section 11 ("no arbitrary/user-supplied package sources should be introduced by this flow"): that clause is about the extension never accepting a user-supplied index/source as *input* to Provisioning, not about fighting the user's own environment. Forcing the public PyPI regardless of local config would break Provisioning entirely for users on a locked-down corporate network that requires a proxy or internal mirror to reach the internet at all — a cost judged worse than the (small) loss of guaranteeing exactly where the package came from.
