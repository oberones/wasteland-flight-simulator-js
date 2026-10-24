#!/usr/bin/env bash
# Run from the repository root with an already loaded, single-platform image.
set -euo pipefail

image=${1:?Usage: smoke-container.sh IMAGE PLATFORM [CONTAINER_NAME]}
platform=${2:?Usage: smoke-container.sh IMAGE PLATFORM [CONTAINER_NAME]}
container_name=${3:-wfs-container-smoke-$$}
container_id=

cleanup() {
  local status=$?
  if [[ -n "$container_id" ]]; then
    if (( status != 0 )); then
      docker logs "$container_id" || true
      docker inspect --format '{{json .State}}' "$container_id" || true
    fi
    docker rm --force "$container_id" >/dev/null || true
  fi
  return "$status"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

actual_platform=$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$image")
[[ "$actual_platform" == "$platform" ]] || {
  printf 'Expected %s, got %s\n' "$platform" "$actual_platform" >&2
  exit 1
}
[[ $(docker image inspect --format '{{.Config.User}}' "$image") == 101:101 ]]

container_id=$(docker run --detach --name "$container_name" \
  --platform "$platform" \
  --user 101:101 \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m,mode=1777 \
  --pids-limit 64 \
  --publish 127.0.0.1::8080 \
  "$image")

healthy=false
for ((attempt = 0; attempt < 60; attempt++)); do
  state=$(docker inspect --format '{{.State.Status}}' "$container_id")
  health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}missing{{end}}' "$container_id")
  if [[ "$health" == healthy ]]; then
    healthy=true
    break
  fi
  if [[ "$state" != running || "$health" == unhealthy || "$health" == missing ]]; then
    printf 'Container state=%s health=%s\n' "$state" "$health" >&2
    exit 1
  fi
  sleep 2
done
[[ "$healthy" == true ]] || { echo 'Timed out waiting for healthcheck' >&2; exit 1; }

docker exec "$container_id" nginx -t
binding=$(docker port "$container_id" 8080/tcp)
python3 - "http://127.0.0.1:${binding##*:}" <<'PY'
import gzip
import re
import sys
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import ProxyHandler, Request, build_opener

base_url = sys.argv[1]
source = Path("index.html").read_bytes()
meta_policy = re.search(
    rb'http-equiv="Content-Security-Policy"\s+content="([^"]+)"', source
).group(1).decode()
expected_headers = {
    "Content-Security-Policy": meta_policy.replace(
        "base-uri", "frame-ancestors 'none'; base-uri"
    ),
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Permissions-Policy": (
        "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
        "magnetometer=(), microphone=(), payment=(), usb=()"
    ),
    "Cache-Control": "no-cache",
    "Server": "nginx",
}
opener = build_opener(ProxyHandler({}))


def check(path, status, method="GET", headers=None):
    request = Request(base_url + path, method=method, headers=headers or {})
    try:
        response = opener.open(request, timeout=10)
    except HTTPError as error:
        response = error
    with response:
        assert response.status == status, (method, path, response.status, status)
        for name, expected in expected_headers.items():
            assert response.headers.get_all(name) == [expected], (
                method, path, name, response.headers.get_all(name), expected
            )
        body = response.read()
        if status == 200:
            assert response.headers.get_content_type() == "text/html", path
            if method == "HEAD":
                assert body == b"", path
            elif headers and headers.get("Accept-Encoding") == "gzip":
                assert response.headers.get("Content-Encoding") == "gzip", path
                assert gzip.decompress(body) == source, path
            else:
                assert body == source, path
    print(f"{method} {path}: {status}; headers and body verified")


for path in ["/", "/index.html"]:
    check(path, 200)
    check(path, 200, method="HEAD")
    for method in ["POST", "PUT", "DELETE", "OPTIONS"]:
        check(path, 403, method=method)
check("/", 200, headers={"Accept-Encoding": "gzip"})
for path in [
    "/missing.js", "/.env", "/.git/config", "/package.json",
    "/nginx/nginx.conf", "/tests/", "/index.html/extra",
]:
    check(path, 404)
PY

printf 'Container smoke checks passed for %s\n' "$platform"
