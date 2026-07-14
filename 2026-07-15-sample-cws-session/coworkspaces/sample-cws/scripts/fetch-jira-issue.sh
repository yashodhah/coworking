#!/usr/bin/env bash
# Example only — fetches a Jira issue via the REST API and writes it to sdd/<issue-key>/.
# Auth: Jira Cloud uses Basic Auth with your account email + an API token
# (create one at https://id.atlassian.com/manage-profile/security/api-tokens).
# Credentials are read from the environment — set these in your shell profile
# (~/.zshrc etc.), never in this repo or in tasks.json:
#   JIRA_BASE_URL   e.g. https://yourcompany.atlassian.net
#   JIRA_EMAIL      the Atlassian account email tied to the token
#   JIRA_API_TOKEN  the API token itself
set -euo pipefail

ISSUE_KEY="${1:?Usage: fetch-jira-issue.sh <ISSUE-KEY>}"
: "${JIRA_BASE_URL:?Set JIRA_BASE_URL, e.g. https://yourcompany.atlassian.net}"
: "${JIRA_EMAIL:?Set JIRA_EMAIL}"
: "${JIRA_API_TOKEN:?Set JIRA_API_TOKEN}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="${SCRIPT_DIR}/../sdd/${ISSUE_KEY}"
mkdir -p "${OUT_DIR}"

RESPONSE=$(curl -sf -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Accept: application/json" \
  "${JIRA_BASE_URL}/rest/api/3/issue/${ISSUE_KEY}")

SUMMARY=$(echo "${RESPONSE}" | jq -r '.fields.summary')
# Jira Cloud descriptions are Atlassian Document Format (ADF) JSON, not plain text.
# This pulls just the top-level paragraph text as a rough example — a real version
# would want a proper ADF-to-markdown renderer.
DESCRIPTION=$(echo "${RESPONSE}" | jq -r '[.fields.description.content[]?.content[]?.text?] | join(" ")')

OUT_FILE="${OUT_DIR}/${ISSUE_KEY}.md"
cat > "${OUT_FILE}" <<EOF
# ${ISSUE_KEY}: ${SUMMARY}

${DESCRIPTION}

---
Fetched from ${JIRA_BASE_URL}/browse/${ISSUE_KEY}
EOF

echo "Wrote ${OUT_FILE}"
