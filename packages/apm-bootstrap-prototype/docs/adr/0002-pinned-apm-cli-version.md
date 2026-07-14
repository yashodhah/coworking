# Pin apm-cli to an exact version tied to extension releases

Provisioning always installs an exact, pinned `apm-cli` version (e.g. `apm-cli==1.4.0`) baked into the extension release — never "whatever is latest on PyPI." A naive reader might expect `pip install apm-cli` with no pin, since that's the simpler command; we deliberately reject that because an unpinned install means a breaking `apm-cli` release could break every user of the extension simultaneously, with no way to control or roll back the exposure.

The Health Check (Section 6.2) was extended beyond "does it run" to also compare the installed version against the currently Pinned Version. This means bumping the pin in a new extension release is sufficient to get existing users onto the new version automatically on their next activation — no separate background upgrade-polling mechanism is needed, and no silent auto-upgrade happens independent of an extension update.
