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

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Edits come from the Mac and from the iPhone. The edits are first held in a
# commit of their own (WIP), which is replayed on top of whatever the other
# side has published. Only then are the search index, version number and
# stamps made, from that latest state, so the two sides never fight over them.
git add -A
git commit -q -m "publish.sh: edits waiting to be published"
WIP=$(git rev-parse HEAD)

# Give the edits back exactly as they were before publish.sh ran.
give_back() {
  git reset -q --hard "$WIP"
  git reset -q --soft HEAD~1
  git reset -q
}

for ATTEMPT in 1 2 3; do
  # Bring in anything published from elsewhere. A clash with the other side's
  # edits, or no connection, stops here with nothing published.
  if ! git pull -q --rebase; then
    git rebase --abort 2>/dev/null || true
    give_back
    echo "publish.sh: these edits clash with what was published from elsewhere, or GitHub could not be reached; nothing was published (the edits are still here)" >&2
    exit 1
  fi
  WIP=$(git rev-parse HEAD)

  # Rebuild the search index from the text, so Search always matches what is published.
  if ! python3 scripts/build_search_index.py; then
    give_back
    echo "publish.sh: could not rebuild the search index; nothing was published" >&2
    exit 1
  fi

  CUR=$(grep -o "commentaries-v[0-9]\{1,\}" sw.js | head -1 | sed 's/commentaries-//')
  if [ -z "$CUR" ]; then
    give_back
    echo "publish.sh: could not read cache version from sw.js" >&2
    exit 1
  fi
  NEW="v$(( ${CUR#v} + 1 ))"
  # perl rather than sed -i, so this runs the same on the Mac and in the cloud.
  perl -pi -e "s/commentaries-${CUR}\b/commentaries-${NEW}/" sw.js
  # Stamp shared scripts with the version, so phones never run a stale cached
  # copy (GitHub lets browsers keep a file for 10 minutes) against a new page.
  perl -pi -e 's/src="(scripture-links|share|search-land)\.js(\?v=\d+)?"/src="$1.js?v='"${NEW#v}"'"/g' ./*.html
  perl -pi -e 's/href="(sanctuary-pages)\.css(\?v=\d+)?"/href="$1.css?v='"${NEW#v}"'"/g' ./*.html

  sed "s/{SW}/${NEW}/g" "$MSGFILE" > "$TMP"

  # One commit: the edits plus the index, version and stamps.
  git add -A
  git reset -q --soft HEAD~1
  git commit -q -F "$TMP"
  if git push -q; then
    break
  fi
  # Refused: the other side published in the meantime. Drop the index,
  # version and stamps (they are made again) and go round from their version.
  git reset -q --hard "$WIP"
  if [ "$ATTEMPT" = 3 ]; then
    give_back
    echo "publish.sh: GitHub kept refusing the push; nothing was published (the edits are still here)" >&2
    exit 1
  fi
  echo "publish.sh: something was published from elsewhere meanwhile; trying again" >&2
done

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
