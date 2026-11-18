#!/bin/sh
# Refresh contribution data, rebuild the SVGs and README, and push.
set -e
cd "$(dirname "$0")"
GH_TOKEN=$(gh auth token) node src/contributions.mjs
node src/build.mjs
git add -A assets README.md data
git diff --cached --quiet && echo "No changes." && exit 0
git commit -m "Update contributions"
git push
