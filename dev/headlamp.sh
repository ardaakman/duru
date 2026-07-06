#!/usr/bin/env bash
# Local Headlamp for duru development.
#   ./dev/headlamp.sh up      start (or replace) the container
#   ./dev/headlamp.sh down    stop and remove it
#   ./dev/headlamp.sh status  container state + loaded plugins
#
# Config (env): HL_KUBECONFIG (default $KUBECONFIG or ~/.kube/config),
#   HL_PLUGINS_DIR (default dev/.headlamp/plugins), HL_VERSION (image tag,
#   default latest), HL_PORT (informational; Headlamp listens on 4466).
#
# WARNING: this runs a full-privilege dashboard for whatever kubeconfig you
# hand it, on host networking. Use on trusted networks only.
set -euo pipefail

NAME=duru-headlamp
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KCFG="${HL_KUBECONFIG:-${KUBECONFIG:-$HOME/.kube/config}}"
PLUGINS="${HL_PLUGINS_DIR:-$ROOT/dev/.headlamp/plugins}"
IMAGE="ghcr.io/headlamp-k8s/headlamp:${HL_VERSION:-latest}"
PORT="${HL_PORT:-4466}"

case "${1:-}" in
  up)
    [ -f "$KCFG" ] || { echo "no kubeconfig at $KCFG (set HL_KUBECONFIG)"; exit 1; }
    mkdir -p "$PLUGINS"
    docker rm -f "$NAME" >/dev/null 2>&1 || true
    docker run -d --name "$NAME" --network host --user "$(id -u):$(id -g)" \
      -e HOME=/tmp \
      -v "$KCFG":/headlamp/kubeconfig.yaml:ro \
      -v "$PLUGINS":/headlamp/plugins:ro \
      "$IMAGE" -kubeconfig=/headlamp/kubeconfig.yaml >/dev/null
    echo "headlamp up: http://localhost:$PORT  (plugins: $PLUGINS)"
    ;;
  down)
    docker rm -f "$NAME" >/dev/null 2>&1 && echo "stopped" || echo "not running"
    ;;
  status)
    docker ps --filter "name=$NAME" --format 'container: {{.Status}}' | grep . || { echo "container: not running"; exit 1; }
    echo -n "plugins: " && curl -sf "http://localhost:$PORT/plugins" || echo "(no response on :$PORT)"
    echo
    ;;
  *)
    echo "usage: $0 up|down|status"; exit 2
    ;;
esac
