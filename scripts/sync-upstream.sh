#!/usr/bin/env bash
# Keeps NeoTube in step with upstream NouTube.
#
#   scripts/sync-upstream.sh check   what upstream has that we lack, and which
#                                    files both sides changed (likely conflicts)
#   scripts/sync-upstream.sh merge   merge upstream into a new branch,
#                                    upstream-sync-YYYYMMDD
#
# Exit codes for `merge`: 0 merged cleanly, 10 already up to date, 1 conflicts.
# Set KEEP_CONFLICTS=0 to abort a conflicting merge (the workflow does this);
# by default the conflicts are left in place for you to resolve.
set -euo pipefail

UPSTREAM_URL=${UPSTREAM_URL:-https://github.com/nonbili/NouTube.git}
UPSTREAM_BRANCH=${UPSTREAM_BRANCH:-main}
KEEP_CONFLICTS=${KEEP_CONFLICTS:-1}
cmd=${1:-check}
ref="upstream/$UPSTREAM_BRANCH"

git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"
git fetch --quiet upstream "$UPSTREAM_BRANCH"

base=$(git merge-base HEAD "$ref" 2>/dev/null || true)
if [ -z "$base" ]; then
  echo "No common history with $ref. Is this repo a fork of NouTube (not a copy of its files)?" >&2
  exit 2
fi

behind=$(git rev-list --count "HEAD..$ref")

report() {
  echo "Upstream is $behind commit(s) ahead."
  echo
  git log --no-merges --format='  %h %s' "HEAD..$ref" | head -40
  [ "$behind" -gt 40 ] && echo "  ... and more"
  echo
  # Files both sides touched since the common ancestor are where conflicts happen.
  overlap=$(comm -12 \
    <(git diff --name-only "$base" HEAD | sort) \
    <(git diff --name-only "$base" "$ref" | sort))
  if [ -n "$overlap" ]; then
    echo "Files changed on both sides (likely conflicts):"
    echo "$overlap" | sed 's/^/  /'
  else
    echo "No overlapping files: the merge should be clean."
  fi
}

case "$cmd" in
  check)
    if [ "$behind" -eq 0 ]; then echo "Up to date with $ref."; else report; fi
    ;;
  merge)
    if [ "$behind" -eq 0 ]; then echo "Up to date with $ref."; exit 10; fi
    if ! git diff --quiet || ! git diff --cached --quiet; then
      echo "Commit or stash your changes first." >&2; exit 3
    fi
    branch="upstream-sync-$(date +%Y%m%d)"
    git checkout -q -b "$branch"
    report | tee .sync-report.txt
    # Paths upstream tracks that this fork ignores on purpose (android/, which expo
    # prebuild regenerates). A modify/delete conflict there is not a real conflict:
    # our side deleted it deliberately. Measure BEFORE merging, while they are still
    # untracked and the ignore rules therefore still apply to them.
    ignored=$(git ls-tree -r --name-only "$ref" | git check-ignore --stdin || true)
    # Upstream ships its own copies of those paths. A merge would overwrite the
    # GENERATED files on disk (android/app/build.gradle and friends) with upstream's,
    # and the next build then compiles against the wrong package. Snapshot ours and
    # put them back once the merge is committed.
    keep=$(mktemp -d)
    while IFS= read -r path; do
      if [ -n "$path" ] && [ -f "$path" ]; then
        mkdir -p "$keep/$(dirname "$path")"
        cp -a "$path" "$keep/$path"
      fi
    done <<< "$ignored"
    restore_generated() {
      while IFS= read -r path; do
        if [ -n "$path" ] && [ -f "$keep/$path" ]; then
          cp -a "$keep/$path" "$path"
        fi
      done <<< "$ignored"
      rm -rf "$keep"
    }
    apply_fixups() {
      bash "$(dirname "$0")/merge-fixups.sh"
      if ! git diff --quiet; then
        git add -A
        git commit -q --amend --no-edit
        echo "Applied scripts/merge-fixups.sh to the merge commit."
      fi
    }
    if git merge --no-edit "$ref"; then
      apply_fixups
      restore_generated
      rm -f .sync-report.txt
      echo; echo "Merged into $branch. Run: bun install && bun test states lib, then build and try it."
    else
      conflicts=$(git diff --name-only --diff-filter=U)
      real=$(comm -23 \
        <(printf '%s\n' "$conflicts" | grep -v '^$' | sort) \
        <(printf '%s\n' "$ignored" | grep -v '^$' | sort) || true)
      if [ -z "$real" ]; then
        while IFS= read -r path; do
          [ -n "$path" ] && git rm --cached -f -q -- "$path"
        done <<< "$conflicts"
        git commit -q --no-edit
        apply_fixups
        restore_generated
        rm -f .sync-report.txt
        echo; echo "Every conflict was a path this fork ignores ($(echo "$conflicts" | tr '\n' ' ')): kept it untracked and committed the merge into $branch."
      else
        rm -rf "$keep"
        { echo; echo "Conflicts:"; echo "$real" | sed 's/^/  /'; } | tee -a .sync-report.txt
        if [ "$KEEP_CONFLICTS" = 0 ]; then git merge --abort; else
          echo "Resolve them, then: git add -A && git commit"
        fi
        exit 1
      fi
    fi
    ;;
  *) echo "Usage: $0 check|merge" >&2; exit 64 ;;
esac
