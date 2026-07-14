# Hide apm's identity from all user-facing text

No progress message, error notification, or command name ever mentions "apm," Python, pip, or venv. All user-facing text is phrased in terms of the extension's own name/features (e.g. "Setting up..." not "Installing apm..."). `apm` is treated purely as an internal implementation detail, invisible to general users — the same way an extension wouldn't surface the name of an internal HTTP client library it depends on.

This is a deliberate choice to keep general users from ever needing to understand or care that a separate CLI tool and Python environment exist behind the scenes. It does cost some transparency for technically curious users, but that trade-off was chosen explicitly: the Output Channel (Section 10) remains available as the escape hatch for anyone who wants the detail.
