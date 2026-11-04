#!/usr/bin/env bash
# Fixes the merge's own fallout: upstream files that pass upstream's checks but fail
# ours, and that are not ours to change upstream. Idempotent — it runs on every sync,
# and does nothing when the patterns are already applied.
set -euo pipefail

changed=0

# legendapp types an optional prop as `void & T`, which erases the call signature of a
# stored callback, so calling one straight off the observable is a type error (never).
# tsconfig.typecheck.json is ours — upstream has no typecheck at all — so the merge
# brings this in and CI goes red on a line nobody wrote for us.
test_file=lib/feed-notifications.native.test.ts
if [ -f "$test_file" ] && grep -qF 'toasts$[0].onPress.get()?.()' "$test_file"; then
  python3 - "$test_file" <<'PY'
import sys

path = sys.argv[1]
with open(path, encoding='utf-8') as handle:
    text = handle.read()

old = '    toasts$[0].onPress.get()?.()'
new = (
    '    // legendapp types an optional prop as `void & T`, which erases the call\n'
    '    // signature of a stored callback; read it out before calling it.\n'
    '    const onPress = toasts$[0].onPress.get() as unknown as (() => void) | undefined\n'
    '    onPress?.()'
)

if old in text and new not in text:
    with open(path, 'w', encoding='utf-8') as handle:
        handle.write(text.replace(old, new, 1))
    print(f'fixed the observable callback call in {path}')
PY
  changed=1
fi

exit 0
