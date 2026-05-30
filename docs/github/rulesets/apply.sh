#!/usr/bin/env bash
# Apply all rulesets to paturikaustubh/parlo
# Prerequisites: gh CLI installed and authenticated

REPO="paturikaustubh/parlo"
DIR="$(dirname "$0")"

for ruleset in main dev release tags; do
  echo "Applying $ruleset ruleset..."
  gh api \
    --method POST \
    -H "Accept: application/vnd.github+json" \
    -H "X-GitHub-Api-Version: 2022-11-28" \
    "/repos/$REPO/rulesets" \
    --input "$DIR/$ruleset.json"
  echo "✓ $ruleset applied"
done

echo "All rulesets applied."
