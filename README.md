# Wasteland Flight Simulator

A deterministic, browser-based 3D glider simulator set above a procedurally
generated post-apocalyptic landscape. The complete production application lives
in a single [`index.html`](./index.html); Node.js and the rest of the repository
exist only for development, testing, and release evidence.

![Dustkite flying above the wasteland](./art/buildings/validation/after-chromium-desktop-level.png)

## What it includes

- A Blender-authored scrap ultralight with patched canvas wings, exposed framing,
  and a seated pilot; [editable source and regeneration tools](./art/glider/README.md)
  accompany geometry embedded directly in the HTML.
- Forgiving but speed-dependent glider physics with lift, drag, gravity, banked
  turns, self-leveling, recoverable stalls, and terrain impacts.
- A camera locked behind and above the glider, with the world horizon providing
  the attitude cue.
- Deterministic, streamed terrain with mountains, cracks, warm lighting, shadows,
  fog, and ash. Four Blender-authored building designs mix ruined towers, an
  industrial works, and a low concrete shell; [editable models and tools](./art/buildings/README.md)
  accompany their embedded geometry.
- Keyboard, optional pointer-lock, and multi-touch controls.
- Desktop and mobile layouts, safe-area handling, deliberate pause/resume,
  portrait-orientation protection, visible focus, and reduced-motion support.
- A fixed 60 Hz simulation and bounded adaptive visual quality.
- No accounts, cookies, storage, analytics, telemetry, backend, or persistent
  player data.

## Runtime architecture

The production topology is intentionally small:

```text
Browser --HTTPS--> static web server --file--> index.html
   |
   +--HTTPS--> jsDelivr --verified bytes--> Three.js and simplex-noise
```

`index.html` is the only shipped application artifact. At startup, the browser
fetches three pinned artifacts from two runtime libraries:

| Dependency    | Version   | Purpose                                         |
| ------------- | --------- | ----------------------------------------------- |
| Three.js      | `0.186.1` | WebGL scene, geometry, materials, and rendering |
| simplex-noise | `4.0.3`   | Seeded procedural terrain noise                 |

The application verifies the SHA-384 digest of all three responses before importing
them through local blob URLs. Redirects, timeouts, unexpected sizes, hash
mismatches, parse errors, or missing exports fail closed and expose a controlled
Retry action. The exact URLs, byte counts, hashes, and allowed Content Security
Policy are documented in the
[runtime dependency contract](./specs/001-wasteland-flight-simulator/contracts/runtime-dependency-contract.md).

## Browser support

- Current stable Chrome and Safari on desktop.
- Current stable Chrome on Android.
- Current stable Safari and Chrome on iOS.
- WebGL 2 and Web Crypto are required.
- Mobile gameplay is landscape-only. Portrait mode pauses the simulator and
  requires an explicit Resume after returning to landscape.

Production and physical-device previews must use HTTPS. Localhost
(`http://127.0.0.1`) is also treated as a trustworthy browser context, but a
plain HTTP LAN address is not suitable for mobile Web Crypto validation.

## Controls

### Desktop

| Action                      | Control                          |
| --------------------------- | -------------------------------- |
| Increase throttle           | `W` or `Shift`                   |
| Decrease throttle           | `S` or `Ctrl`                    |
| Pitch up/down               | `Arrow Up` / `Arrow Down`        |
| Roll left/right             | `Arrow Left` / `Arrow Right`     |
| Enable pointer control      | Select the flight canvas         |
| Release pointer control     | `Escape`                         |
| Pause or resume             | `P` or the visible action button |
| Restart after a crash       | `R` or the Restart button        |
| Activate the focused action | `Enter`                          |

Pointer movement drives a bounded virtual stick rather than rotating the camera.
Releasing pointer lock, pausing, losing focus, crashing, or changing orientation
returns the stick to neutral.

### Mobile

- Use the left virtual joystick for pitch and roll.
- Hold **Throttle +** or **Throttle -** independently of the joystick.
- Use the semantic Pause, Resume, Restart, and Retry buttons as they appear.
- Returning from portrait or from a backgrounded browser never resumes flight
  automatically.

## Quick start

### Prerequisites

- Node.js `24.22.1`
- npm `12.2.1`
- Current Chrome and Safari for manual desktop checks

The exact Node and npm versions are declared in [`package.json`](./package.json);
`.nvmrc` selects the matching Node release.
Using those versions keeps results aligned with the checked-in lockfile and
validation evidence.

### Install development tooling

```bash
npm ci
npx playwright install chromium webkit
```

On a fresh Linux CI host, Playwright can also install required system packages:

```bash
npx playwright install --with-deps chromium webkit
```

All npm packages are development-only. The production page does not load
anything from `node_modules`.

### Run locally

```bash
npm run serve
```

Open <http://127.0.0.1:4173/>. Expected startup behavior is:

1. The loading state appears immediately.
2. The three pinned CDN responses are fetched in parallel.
3. All three SHA-384 digests and required exports verify.
4. WebGL 2 initializes.
5. The glider, terrain, HUD, and relevant controls appear.

Playwright starts the same local server automatically when a test command runs,
so a separate server process is not required for automated tests.

The Three.js ESM renderer and core are verified separately. Both renderer core references
are linked to the verified core blob; unexpected imports fail closed.

## Development workflow

The application is physically a single document, but its inline JavaScript is
organized into explicit subsystems for dependency loading, lifecycle, input,
simulation, world streaming, rendering, camera, HUD, and adaptive quality.

### Useful commands

| Command                                 | Purpose                                                                              |
| --------------------------------------- | ------------------------------------------------------------------------------------ |
| `npm run serve`                         | Serve the repository at `127.0.0.1:4173` without caching                             |
| `npm run format`                        | Format the application, configuration, tests, and evidence                           |
| `npm run format:check`                  | Check formatting without modifying files                                             |
| `npm run lint`                          | Run ESLint with zero warnings allowed                                                |
| `npm run buildings:embed`               | Validate and embed the saved Blender building export                                 |
| `npm run buildings:check`               | Verify building geometry, provenance, budgets, and embedding consistency             |
| `npm run typecheck`                     | Run strict TypeScript `checkJs` validation                                           |
| `npm run verify:runtime-deps`           | Verify exact runtime URLs, bytes, hashes, exports, licenses, CSP, and request budget |
| `npm run verify:forbidden-runtime-apis` | Reject prohibited runtime APIs and behaviors                                         |
| `npm run audit:dependencies`            | Audit the development dependency resolution                                          |
| `npm run test:unit`                     | Run deterministic flight, terrain, lifecycle, and input tests                        |
| `npm run test:integration`              | Run dependency, streaming, crash/restart, and responsive-control tests               |
| `npm run test:e2e`                      | Run desktop and mobile flight journeys                                               |
| `npm run test:accessibility`            | Run automated accessibility and lifecycle assertions                                 |
| `npm run test:network`                  | Exercise CDN success and fail-closed dependency cases                                |
| `npm run test:performance:smoke`        | Run the short performance contract matrix                                            |
| `npm run test:performance:full`         | Run the full automated performance workloads                                         |
| `npm test`                              | Run the complete Playwright matrix                                                   |
| `npm run validate:automated`            | Run asset checks, formatting, lint, types, security checks, and all automated tests  |
| `npm run validate`                      | Run automated validation and require the formal physical-device qualification report |

Recommended inner loop:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
```

Before review or deployment, run at least:

```bash
npm run validate:automated
npm run audit:dependencies
```

Formal release qualification additionally requires the physical-device and
manual evidence described under [Release qualification](#release-qualification).

### Test matrix

[`playwright.config.js`](./playwright.config.js) defines four projects:

- Desktop Chromium at 1280x720.
- Desktop WebKit at 1280x720.
- Mobile Chromium using a Pixel 7 landscape profile.
- Mobile WebKit using an iPhone 13 landscape profile.

Tests cover deterministic fixtures, terrain seams, region recycling, origin
rebasing, stalls, crashes and restarts, dependency failures, request allowlisting,
keyboard/pointer/touch input, responsive states, accessibility, and performance
smoke budgets. Building tests also cover descriptor compatibility, complete window
panels, transformed normals, empty regions, and stable pooled resources. Browser emulation is functional evidence; it does not replace the
required physical-device performance runs.

### Repository layout

```text
index.html                           # Sole production artifact
art/glider/                          # Editable Blender glider and export evidence
art/buildings/                       # Four editable Blender buildings and export evidence
package.json / package-lock.json     # Development tooling and exact resolution
eslint.config.js / jsconfig.json     # Static analysis
playwright.config.js                 # Browser projects and test server
tests/
  unit/                              # Pure simulation and input behavior
  integration/                       # Runtime boundaries and lifecycle behavior
  e2e/                               # User journeys, accessibility, performance
  helpers/                           # Fixtures, metrics, dependency verification
specs/001-wasteland-flight-simulator/
  spec.md                            # Requirements and acceptance criteria
  plan.md                            # Architecture and technology decisions
  contracts/                         # Runtime, simulation, UI, performance contracts
  quickstart.md                      # Full validation workflow
  tasks.md                           # Implementation and qualification task ledger
evidence/                            # Generated and reviewed release evidence
```

Development files and `evidence/` are never copied into the runtime package.

## Security and privacy contract

Changes must preserve these production boundaries:

- Ship only root `index.html`.
- Keep the runtime request budget to the document plus the three exact jsDelivr
  dependency responses.
- Verify all three artifacts with SHA-384 before evaluation.
- Do not add analytics, telemetry, external assets, fonts, textures, models,
  source maps, fallback CDNs, or automatic retry loops.
- Do not use cookies, local/session storage, IndexedDB, service workers, URL
  parameters, or fragments to influence application behavior.
- Do not expose raw dependency responses, stack traces, source text, or local
  paths in public errors.
- Keep test controls behind the frozen `navigator.webdriver`-only facade.

The app itself collects and transmits no player data. Production web-server
access logs are separate operational data and may include IP addresses and user
agents; configure retention, access, and anonymization according to the host's
privacy policy.

## Production deployment

### Recommended topology

For an Ubuntu server that already runs Nginx, serve `index.html` directly from
that Nginx instance. There is no application server, build output, Node.js
runtime, API, database, or process to supervise. Adding a second Nginx process in
Docker is useful only when container-based packaging and rollback are part of
the server's normal operating model.

Whichever topology is used:

- Terminate TLS at the public Nginx server.
- Redirect HTTP to HTTPS.
- Add an HTTP CSP header equivalent to or stricter than the document's meta CSP.
- Serve only the release copy of `index.html`; unknown paths should return 404.
- Let browsers reach `https://cdn.jsdelivr.net` for the three verified artifact
  downloads. The Ubuntu server itself does not fetch those runtime files.
- Do not configure an SPA fallback that serves `index.html` for every path.

### Prepare a release artifact

From a clean, reviewed checkout:

```bash
npm ci
npx playwright install chromium webkit
npm run validate:automated
npm run audit:dependencies
openssl dgst -sha384 index.html
```

The only file to transfer is `index.html`. Record its commit and digest in the
deployment record. A formal release should also have a passing `npm run validate`
result; see the qualification caveat below.

### Option A: serve directly from host Nginx

Copy the artifact into a versioned directory and switch a stable symlink. For
example, after transferring `index.html` to the server:

```bash
release_id=2026-08-24-001
sudo install -d -o root -g www-data -m 0755 "/srv/wasteland-flight-simulator/releases/${release_id}"
sudo install -o root -g www-data -m 0644 index.html "/srv/wasteland-flight-simulator/releases/${release_id}/index.html"
sudo ln -sfn "/srv/wasteland-flight-simulator/releases/${release_id}" /srv/wasteland-flight-simulator/current
```

Create `/etc/nginx/snippets/wfs-security.conf`:

```nginx
add_header Content-Security-Policy "default-src 'none'; script-src 'unsafe-inline' blob:; connect-src https://cdn.jsdelivr.net; style-src 'unsafe-inline'; img-src data:; font-src 'none'; media-src 'none'; object-src 'none'; worker-src 'none'; frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'" always;
add_header Referrer-Policy "no-referrer" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;
add_header Cache-Control "no-cache" always;
```

Then create a site such as
`/etc/nginx/sites-available/wasteland-flight-simulator.conf`, replacing the
domain and certificate paths:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name flight.example.com;

    return 308 https://$host$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name flight.example.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    root /srv/wasteland-flight-simulator/current;
    index index.html;
    autoindex off;

    include /etc/nginx/snippets/wfs-security.conf;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;

    location / {
        try_files $uri =404;

        limit_except GET HEAD {
            deny all;
        }
    }
}
```

If an existing TLS front already owns the `server` block, merge the `root`,
`index`, security snippet, compression, and `location` directives into it rather
than creating a competing listener.

Nginx inherits `add_header` directives only when a lower configuration level has
no `add_header` directives of its own. Keep the security headers together in the
snippet and do not add an isolated header inside the `location` block unless the
complete set is included there too.

Enable and verify the site:

```bash
sudo ln -s /etc/nginx/sites-available/wasteland-flight-simulator.conf /etc/nginx/sites-enabled/wasteland-flight-simulator.conf
sudo nginx -t
sudo systemctl reload nginx
curl -fsSI https://flight.example.com/
curl -fsS https://flight.example.com/ | openssl dgst -sha384
```

Compare the remote digest with the reviewed local artifact. In a real browser,
also confirm:

- the page is served over HTTPS;
- the CSP and other security headers are present;
- the console contains no application error;
- the Network panel shows the document and exactly three jsDelivr runtime
  responses; and
- unknown paths return 404.

To roll back, repoint `current` to a previously retained release, run
`sudo nginx -t`, and reload Nginx.

### Option B: Docker behind an HTTPS reverse proxy

The checked-in `Dockerfile`, `docker-compose.yml`, and `nginx/` configuration
package only `index.html` as application content. No Node runtime, build step,
server persistence, or application environment variables are needed. The
`.dockerignore` allowlist excludes repository metadata, environment files,
artwork sources, tests, and development dependencies.

The container runs Nginx as UID/GID `101:101` on port `8080`, with a read-only
filesystem, all capabilities dropped, a 64-process limit,
and a 16 MiB `/tmp` tmpfs mounted `noexec,nosuid,nodev`. Logs go to stdout/stderr
with rotation at 10 MiB and three retained files. The HTTP health check requests
`/index.html`. Use Compose to apply these restrictions; plain `docker run` does
not automatically inherit them.

Create the external proxy network if it does not already exist, then start:

```bash
docker network inspect web-backend >/dev/null 2>&1 || docker network create web-backend
make docker-config
make docker-build
make docker-up
curl -fsSI http://127.0.0.1:8088/
```

The Makefile also provides `docker-logs` and `docker-down`. Equivalent lifecycle
commands are `docker compose build --pull`, `docker compose up -d --wait`,
`docker compose logs -f`, and `docker compose down`.

Compose accepts these optional settings from the shell or a local `.env` file
(which never enters the build context):

| Variable | Default | Purpose |
| --- | --- | --- |
| `WFS_PORT` | `8088` | Loopback host port |
| `WFS_NETWORK` | `web-backend` | Existing external proxy network |
| `WFS_IMAGE` | `wasteland-flight-simulator:local` | Image tag or retained release reference |

The container serves only `/` and `/index.html`, permits GET/HEAD on those
routes, and returns 404 for unknown paths. Security headers belong to the app
container, including the document's CSP plus `frame-ancestors 'none'` and
`Cache-Control: no-cache`. Preserve these headers through the proxy; do not
add a second application CSP/security-header snippet there. TLS, the public
HTTP-to-HTTPS redirect, and any hostname-wide HSTS policy belong to the proxy.
Browser access to jsDelivr is still required for the three verified modules.

For `/apps/wasteland-flight-simulator/`, add these locations to the existing
HTTPS server block:

```nginx
location = /apps/wasteland-flight-simulator {
    return 308 /apps/wasteland-flight-simulator/;
}

location /apps/wasteland-flight-simulator/ {
    proxy_pass http://wasteland-flight-simulator:8080/;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

The proxy container must join the same `web-backend` network. For host Nginx,
use `http://127.0.0.1:8088/` instead. The trailing slash on `proxy_pass` strips
the public prefix; the simulator needs no base-path build argument. Validate
and reload the proxy after configuration changes and container recreation if
it caches the old upstream IP. For a dedicated hostname, use `location /`.

Verify the container and then repeat HTTP/browser checks through public HTTPS:

```bash
docker compose ps
docker compose exec wasteland-flight-simulator nginx -t
docker compose logs --tail=100 wasteland-flight-simulator
curl -fsS http://127.0.0.1:8088/ | openssl dgst -sha384
openssl dgst -sha384 index.html
curl -fsSI https://YOUR_HOST/apps/wasteland-flight-simulator/
curl -I https://YOUR_HOST/apps/wasteland-flight-simulator/missing.js
```

The two digests must match; the missing path must return 404. Confirm the
slashless public path redirects, the HTML and error responses retain security
headers, and the browser starts with exactly three CDN requests and no CSP
errors. To run the browser suite against an already running container:

```bash
WFS_TEST_BASE_URL=http://127.0.0.1:8088 npm test
```

This disables Playwright's development server. Use the container origin root
for the automated suite; public-prefix checks remain deployment acceptance.

For a locally built release, set `WFS_IMAGE=wasteland-flight-simulator:RELEASE_ID`
consistently for build and startup and retain the previous image. To roll back
without rebuilding, select that retained tag or registry digest and run:

```bash
WFS_IMAGE=wasteland-flight-simulator:PREVIOUS_RELEASE docker compose up -d --no-build --wait
```

The base image is pinned by version and multi-platform digest. Review upstream
security updates, resolve the new digest with `docker buildx imagetools inspect`,
update both in the Dockerfile, and rebuild/revalidate. `--pull` alone does not
advance a digest pin. Review image vulnerability scan results before release;
pinning and runtime restrictions are not a vulnerability assessment.

### Versioned images on GHCR

The [publishing workflow](./.github/workflows/publish.yml) publishes the
existing Dockerfile to `ghcr.io/oberones/wasteland-flight-simulator-js` when a
`v*` tag is pushed. It first requires strict stable `vMAJOR.MINOR.PATCH` syntax:
`v1.2.3` and `v0.0.0` are valid; `v01.2.3`, `v1.2`, `v1.2.3-rc.1`, and
`v1.2.3+build` are rejected before builds or GHCR login. The Git tag determines
the image version; it does not need to match `package.json`.

Each architecture is built and smoke-tested on Ubuntu with Buildx/QEMU after
Compose configuration validation. The checks run with the same non-root,
read-only, capability-free restrictions and temporary `/tmp` storage as Compose.
They require a healthy container, exact checked-out HTML at `/` and `/index.html`,
working HEAD and gzip responses, 404s for unknown paths, denied write methods,
and the configured security headers on success and error responses. Test
containers are removed after success or failure. Both `linux/amd64` and
`linux/arm64` must pass before the publishing job can authenticate or push.

A successful `v1.2.3` publication creates these multi-platform references:

| Image reference | Meaning |
| --- | --- |
| `ghcr.io/oberones/wasteland-flight-simulator-js:1.2.3` | Stable release version |
| `ghcr.io/oberones/wasteland-flight-simulator-js:sha-<full-commit-sha>` | Tagged source commit |
| `ghcr.io/oberones/wasteland-flight-simulator-js:latest` | Last successfully published stable release |

`latest` follows successful publication order, which may differ from semantic
version order. Publishing or rerunning an older release can move it backwards.
Use a version tag or, for an exact immutable reference, the multi-platform
`@sha256:...` digest reported in the workflow summary. Images carry OCI source,
revision, and version labels. Never move an existing release tag to new code.

After reviewing the intended commit and completing the applicable qualification,
create and push a new tag explicitly (replace the example version):

```bash
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin refs/tags/v1.2.3
```

The tagged commit must contain the workflow. Publishing uses `github.actor` and
the automatic `GITHUB_TOKEN`; no personal token or deployment secrets are
needed in Actions. Repository/package policy must allow publishing: only the
publish job requests `packages: write`, with `contents: read` elsewhere. If the
package already exists, ensure this repository has Actions write access to it.
New packages are private by default. The workflow does not change visibility
or deploy anything. See [GitHub's GHCR access documentation](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry).

Public packages can be pulled anonymously. To pull a private package, use a
GitHub account with package read access and a personal access token (classic)
with `read:packages` (authorize organization SSO if required). With that token
already supplied securely in `GHCR_READ_TOKEN`:

```bash
printf '%s' "$GHCR_READ_TOKEN" | docker login ghcr.io --username YOUR_GITHUB_USER --password-stdin
```

#### Production Compose setup

The standalone [production Compose file](./deploy/compose.production.yml)
follows the `local-dope-wars` deployment layout. It pulls the GHCR image without
a build section or source mounts, uses the stable project/container name
`wasteland-flight-simulator`, and sets `restart: always`. Docker selects the
host's native architecture from the published AMD64/ARM64 manifest. Runtime
restrictions, loopback port, external network, and log limits match the local
Compose configuration; the image provides its health check.

After the first successful publication, copy `deploy/compose.production.yml`
to a dedicated directory on the target host as `compose.yml`, for example
`/opt/wasteland-flight-simulator/compose.yml`. That directory needs only this
file and a `.env`; no source checkout, Node tooling, or build is required.
Authenticate to GHCR as described above if the package is private. Keep
registry credentials outside Compose and `.env`.

In the deployment directory, create `.env` with a successfully published image:

```dotenv
WFS_IMAGE=ghcr.io/oberones/wasteland-flight-simulator-js:1.2.3
WFS_PORT=8088
WFS_NETWORK=web-backend
```

`WFS_IMAGE` accepts a version tag, `sha-<full-commit-sha>` tag, or full
`ghcr.io/oberones/wasteland-flight-simulator-js@sha256:...` digest. Record the
previous reference before updating it. An absent or empty `WFS_IMAGE` selects
`ghcr.io/oberones/wasteland-flight-simulator-js:latest` in production; the root
`docker-compose.yml` still defaults to `wasteland-flight-simulator:local`.
Shell variables override `.env`, so clear old shell overrides before use.

```bash
cd /opt/wasteland-flight-simulator
unset WFS_IMAGE WFS_PORT WFS_NETWORK
docker network inspect web-backend >/dev/null 2>&1 || docker network create web-backend
docker compose --env-file .env config --quiet
docker compose --env-file .env pull wasteland-flight-simulator
```

Inspect/create the configured network instead if overriding `WFS_NETWORK`.
The reverse proxy must join that same external network.

If replacing an existing local-build instance, pull the new image first, then
stop and remove only the old app service from its original checkout, using its
original Compose project/options:

```bash
docker compose --file docker-compose.yml stop wasteland-flight-simulator
docker compose --file docker-compose.yml rm --force wasteland-flight-simulator
```

Keep the old image until acceptance. This cutover causes a brief outage;
the two stacks must not compete for the loopback port or proxy service name.
After cutover, use the production Compose file for subsequent operations.

Start the selected image from the deployment directory:

```bash
cd /opt/wasteland-flight-simulator
docker compose --env-file .env up -d --no-build --wait --wait-timeout 120 wasteland-flight-simulator
docker compose --env-file .env ps
docker inspect --format '{{.Config.Image}} {{.State.Health.Status}}' wasteland-flight-simulator
docker inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' wasteland-flight-simulator
docker compose --env-file .env exec wasteland-flight-simulator nginx -t
docker compose --env-file .env logs --tail=100 wasteland-flight-simulator
curl -fsSI http://127.0.0.1:8088/
```

Confirm the selected image and source revision, and require `healthy`. Use
the configured host port if overriding `WFS_PORT`. Keep the proxy upstream
`http://wasteland-flight-simulator:8080/` and repeat the public HTTPS/browser
checks above; reload the proxy if it caches the old container IP.

For updates, persist the new image reference in `.env`, then run the following
from the deployment directory. To roll back, set `WFS_IMAGE` in `.env` to the
previous successful version, SHA tag, or digest and run the same commands:

```bash
unset WFS_IMAGE WFS_PORT WFS_NETWORK
docker compose --env-file .env config --quiet
docker compose --env-file .env pull wasteland-flight-simulator
docker compose --env-file .env up -d --no-build --wait --wait-timeout 120 wasteland-flight-simulator
```

Repeat the health and public checks after either operation. Persisting the
selected image in `.env` keeps later commands on that release. When operating
directly from this checkout instead, select the standalone file explicitly
with `docker compose --file deploy/compose.production.yml`; do not merge it
with the root Compose file, which contains local build settings.

#### Verify publication

After the first authorized tag push, inspect the **Publish container image**
run in GitHub Actions: tag validation, both verification jobs, and publication
must succeed. Record its published digest and compare all three references:

```bash
git rev-parse 'v1.2.3^{commit}'
docker buildx imagetools inspect ghcr.io/oberones/wasteland-flight-simulator-js:1.2.3
docker buildx imagetools inspect ghcr.io/oberones/wasteland-flight-simulator-js:sha-FULL_COMMIT_SHA
docker buildx imagetools inspect ghcr.io/oberones/wasteland-flight-simulator-js:latest
```

Replace `FULL_COMMIT_SHA` with the full resolved commit. Each manifest must
include `linux/amd64` and `linux/arm64` and match the summary digest (`latest`
may have advanced if another release published since then). Additional
attestation manifests may also appear. Local smoke checks cannot establish
hosted workflow or GHCR publishing success. Container checks gate publication;
the full browser suite and physical-device release qualification remain separate.

To reproduce the container gate locally for either architecture:

```bash
docker compose config --quiet
docker compose --file deploy/compose.production.yml config --quiet
docker buildx build --platform linux/amd64 --load -t wasteland-flight-simulator:smoke-amd64 .
bash .github/scripts/smoke-container.sh wasteland-flight-simulator:smoke-amd64 linux/amd64
docker buildx build --platform linux/arm64 --load -t wasteland-flight-simulator:smoke-arm64 .
bash .github/scripts/smoke-container.sh wasteland-flight-simulator:smoke-arm64 linux/arm64
```

The host needs Docker/Buildx, Bash, Python 3, and emulation support for a
non-native architecture. For workflow changes, also run
`actionlint .github/workflows/publish.yml` and exercise the tag-validation step with valid,
leading-zero, incomplete, and prerelease versions. The workflow uses
[Docker's multi-platform build](https://docs.docker.com/build/ci/github-actions/multi-platform/)
and [GitHub Actions cache](https://docs.docker.com/build/ci/github-actions/cache/)
support with SHA-pinned actions.

### Production operations checklist

- Keep DNS and TLS certificate renewal monitored.
- Expose only public ports 80 and 443; keep a container origin on loopback or a
  private Docker network.
- Validate Nginx configuration before every reload.
- Retain the previous artifact or image digest for rollback.
- Compare the deployed `index.html` digest with the approved release digest.
- Review Nginx and container-image security updates on a regular schedule.
- Re-run the runtime dependency and npm audits before each release.
- Monitor origin availability, TLS failures, 4xx/5xx rates, and CDN reachability
  without adding browser telemetry to the application.
- Apply an HSTS policy only when the hostname and any selected subdomains are
  intended to remain HTTPS-only.
- Never replace the three pinned CDN URLs or hashes as an emergency fallback;
  review and test any dependency update as a source change.

## Release qualification

The Dustkite change passed 160 automated tests with four non-applicable project
skips and zero failures, plus 20 performance smoke checks using one worker. See
the [asset validation report](./art/glider/validation/report.json). Headless frame
timings missed the release targets; these checks do not establish physical-device
performance qualification. The [earlier test matrix](./evidence/validation/automated-tests.md)
records the pre-Dustkite baseline.

The checked-in [final validation report](./evidence/validation/final-report.md)
still fails closed because formal desktop/mobile performance captures and a
required physical accessibility review are missing. The application can be
deployed for preview or evaluation, but do not describe the current checkout as
fully release-qualified until these commands have produced valid evidence:

```bash
npm run qualify:preflight
npm run qualify:desktop
npm run qualify:android
npm run qualify:ios
npm run qualify:report
npm run validate
```

Reference qualification uses an Apple M1 desktop with Chrome and Safari, a
physical Pixel 7 with Chrome, and a physical iPhone 13 with Safari and Chrome.
Missing hardware, dirty artifacts, unexpected requests, console errors,
over-budget results, or incomplete reviewer provenance are failures rather than
skips. See the [validation quickstart](./specs/001-wasteland-flight-simulator/quickstart.md)
and [performance contract](./specs/001-wasteland-flight-simulator/contracts/performance-contract.md).

## Troubleshooting

### The page reports an unsupported browser or dependency error

- Confirm the browser supports WebGL 2 and Web Crypto.
- Use `https://` in production or `http://127.0.0.1` locally.
- Confirm browser extensions, a firewall, DNS filtering, or a corporate proxy
  are not blocking `cdn.jsdelivr.net` or rewriting its responses.
- Run `npm run verify:runtime-deps` to distinguish a local artifact change from
  a network problem.
- Do not weaken CSP or bypass digest verification to make startup succeed.

### Playwright cannot find a browser

```bash
npx playwright install chromium webkit
```

On Linux, add `--with-deps` when the host is also missing browser system
libraries.

### Port 4173 is already in use

Stop the process already bound to `127.0.0.1:4173`, or allow the Playwright-owned
server to start without running `npm run serve` separately.

### Mobile testing works on localhost but not over the LAN

A plain LAN HTTP origin is not an acceptable production-like secure context.
Expose the preview through trusted HTTPS, then repeat the test on the physical
device.

## Design and contributor documentation

- [Feature specification](./specs/001-wasteland-flight-simulator/spec.md)
- [Implementation plan](./specs/001-wasteland-flight-simulator/plan.md)
- [Data model](./specs/001-wasteland-flight-simulator/data-model.md)
- [Simulation contract](./specs/001-wasteland-flight-simulator/contracts/simulation-contract.md)
- [UI and input contract](./specs/001-wasteland-flight-simulator/contracts/ui-state-contract.md)
- [Runtime dependency contract](./specs/001-wasteland-flight-simulator/contracts/runtime-dependency-contract.md)
- [Performance contract](./specs/001-wasteland-flight-simulator/contracts/performance-contract.md)
- [Task ledger](./specs/001-wasteland-flight-simulator/tasks.md)
- [Evidence policy](./evidence/README.md)

Before changing behavior, update the applicable requirement or contract and its
tests. Preserve deterministic fixtures and distinguish automated browser results,
manual visual/accessibility review, and physical-device qualification in all
status reports.

## Licensing

Three.js and simplex-noise are MIT licensed; reviewed notices are stored under
[`evidence/licenses/`](./evidence/licenses/). This repository does not currently
contain a project-level `LICENSE` file, so no separate license is asserted here
for the application source.

## Deployment references

- [Nginx: serving static content and reloading configuration](https://nginx.org/en/docs/beginners_guide.html)
- [Nginx response-header directives](https://nginx.org/en/docs/http/ngx_http_headers_module.html)
- [Docker Official Nginx image](https://hub.docker.com/_/nginx)
- [Docker Compose service reference](https://docs.docker.com/reference/compose-file/services/)

## Decorative scenery

The world includes 32 original Blender-authored scenery assets arranged into six
sparse civilian, industrial, and rocky site types. They are decorative and do not
affect terrain or flight collision. Editable source, reproducible export commands,
budgets, and validation are in [art/scenery/README.md](art/scenery/README.md); browse
the [labeled asset gallery](art/scenery/previews/gallery.html). Run
`npm run scenery:check` to verify geometry, provenance, budgets, and embedding.
