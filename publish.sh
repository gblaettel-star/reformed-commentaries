#!/bin/bash
# publish.sh — the standing edit routine for the unified commentaries app:
#   bump the sw.js cache version, commit, push, and verify.
#
# Usage:  /Users/garryblattel/Documents/commentaries/unified/publish.sh <message-file>
#
# The message file may contain the placeholder {SW}; it is replaced with the
# NEW cache version, so a commit message can never quote a predicted number.
#
# Called as a single command with an absolute path so it matches one
# permission rule instead of prompting for every compound shell chain.

set -euo pipefail
cd "$(dirname "$0")"

MSGFILE="${1:-}"
if [ -z "$MSGFILE" ]; then
  echo "usage: publish.sh <message-file>" >&2
  exit 2
fi
if [ ! -f "$MSGFILE" ]; then
  echo "publish.sh: message file not found: $MSGFILE" >&2
  exit 2
fi

if [ -z "$(git status --porcelain)" ]; then
  echo "publish.sh: nothing to commit, working tree clean" >&2
  exit 1
fi

CUR=$(grep -o "commentaries-v[0-9]\{1,\}" sw.js | head -1 | sed 's/commentaries-//')
if [ -z "$CUR" ]; then
  echo "publish.sh: could not read cache version from sw.js" >&2
  exit 1
fi
NEW="v$(( ${CUR#v} + 1 ))"
sed -i '' "s/commentaries-${CUR}/commentaries-${NEW}/" sw.js

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
sed "s/{SW}/${NEW}/g" "$MSGFILE" > "$TMP"

git add -A
git commit -q -F "$TMP"
git push -q

HEAD_SHA=$(git rev-parse HEAD)
UP_SHA=$(git rev-parse '@{u}')
DIRTY=$(git status --porcelain | wc -l | tr -d ' ')

echo "sw.js:   ${CUR} -> ${NEW}"
echo "commit:  ${HEAD_SHA:0:7}  $(git log -1 --pretty=%s)"
if [ "$HEAD_SHA" = "$UP_SHA" ]; then
  echo "pushed:  HEAD == upstream OK"
else
  echo "pushed:  MISMATCH — HEAD ${HEAD_SHA:0:7} vs upstream ${UP_SHA:0:7}" >&2
  exit 1
fi
echo "tree:    ${DIRTY} uncommitted file(s)"
