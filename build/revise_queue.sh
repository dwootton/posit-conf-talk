#!/bin/bash
# Run a batch of vw.edit() revisions in parallel, one working directory each.
#
#   bash build/revise_queue.sh <batch-name> <widget> <widget> ...
#
# Each request is read from build/requests/<widget>.txt. Parallel runs need a
# cwd apiece: the library names its bundle from the current second plus a hash
# of the cwd, so two runs started together in one directory collide on the file.
# Logs land in build/logs/<batch>-<widget>.log.
set -u

DECK="$(cd "$(dirname "$0")/.." && pwd)"
REPO="/Users/dwootton/Projects/vibe-widgets-sundai"
BATCH="$1"; shift

set -a; . "$REPO/.env"; set +a
export VIBE_DISABLE_BUNDLING=1
mkdir -p "$DECK/build/logs"

pids=()
for name in "$@"; do
  req="$DECK/build/requests/$name.txt"
  [ -f "$req" ] || { echo "!! no request file for $name"; continue; }
  work="$(mktemp -d "/tmp/vw-$name-XXXX")"
  (
    cd "$work" || exit 1
    python3 "$DECK/build/revise_widgets.py" "$name" "$(cat "$req")"
  ) >"$DECK/build/logs/$BATCH-$name.log" 2>&1 &
  pid=$!
  pids+=($pid)
  echo "started $name (pid $pid, cwd $work)"
done

fail=0
if [ ${#pids[@]} -gt 0 ]; then
  for pid in "${pids[@]}"; do wait "$pid" || fail=$((fail + 1)); done
fi
echo "batch $BATCH done, $fail failure(s)"
exit $fail
