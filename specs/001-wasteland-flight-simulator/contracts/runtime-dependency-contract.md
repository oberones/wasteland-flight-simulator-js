# Runtime Dependency and Security Contract

**Applies to**: shipped `index.html`
**Network budget**: the document plus exactly three external runtime responses

## Approved Dependencies

| Artifact      | Version | License | Exact URL                                                                    | Expected bytes | SHA-384 (hex)                                                                                      |
| ------------- | ------- | ------- | ---------------------------------------------------------------------------- | -------------: | -------------------------------------------------------------------------------------------------- |
| Three.js      | 0.186.1 | MIT     | `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js`           |         662772 | `9bc268157e7657a346bf6bac8a99e52c92a725f2fb204f1d6e788f0c309219242fdc79b89fa3e37d5eacc95c1fba845c` |
| simplex-noise | 4.0.3   | MIT     | `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js` |          18735 | `5666e8c9abefc5348abc53555ae66de04d4a6364d29cbd6966cc6df76a0579bf1de23a85682b9e49f120471447f235a2` |
| Three.js core | 0.186.1 | MIT     | `https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.core.js`             |        1458113 | `99d29e0b03c471b0efcdac70866f8c56e2e8328bbe13b8d0aabb38b66bbf9fc1c160f188d6466dd0c909c65311e3314c` |

No alias, range, query parameter, redirect-selected URL, addon, fallback CDN, analytics,
font, image, texture, model, audio, data, worker, source map, or favicon request is allowed.
The document MUST include a data-URL favicon to suppress an implicit `/favicon.ico` request.

## Loader Sequence

1. Render the semantic loading state before network activity.
2. Confirm `fetch`, `crypto.subtle.digest`, `Blob`, blob URLs, dynamic import, and WebGL 2
   prerequisites exist. Otherwise enter controlled dependency/capability error.
3. Start one `GET` for each exact URL in parallel with CORS mode, omitted credentials,
   no referrer, and an explicit bounded timeout.
4. Reject non-2xx responses, redirects to any non-identical final URL, missing/empty
   bodies, timeouts, aborts, or bodies larger than an implementation guard above the
   reviewed expected size.
5. Digest the raw `ArrayBuffer` with SHA-384, encode lowercase hex, and compare using a
   length-stable exact comparison before constructing a blob.
6. Wait until all three responses pass size and hash checks, then decode with fatal UTF-8 handling.
   Validate the reviewed graph: the renderer contains exactly two static references to
   `./three.core.js`; core and simplex-noise contain no imports. Reject unexpected
   references, dynamic imports, and CommonJS dependencies before evaluating any module.
7. Create the verified core blob. Rewrite both renderer core specifiers to its URL, then
   create renderer and simplex-noise blobs. Import all namespaces and wait for every
   import to settle before revoking every blob URL, including on failure.
8. Shape-check the renderer namespace for `Scene`, `PerspectiveCamera`, `WebGLRenderer`,
   `BufferGeometry`, `BufferAttribute`, `Mesh`, `Points`, `Fog`, `AmbientLight`, and
   `DirectionalLight`; core for `Scene`, `BufferGeometry`, and `BufferAttribute`; and
   simplex-noise for callable `createNoise2D`.
9. Start application construction only after all three records verify, the complete graph
   imports successfully, and WebGL 2 renderer construction succeeds.

The loader MUST never use `eval`, `Function`, DOM script injection, `innerHTML`, URL
parameters, fragments, storage, or external text as code or interface content.

## Content Security Policy

The document MUST carry a meta policy equivalent to:

```text
default-src 'none';
script-src 'unsafe-inline' blob:;
connect-src https://cdn.jsdelivr.net;
style-src 'unsafe-inline';
img-src data:;
font-src 'none';
media-src 'none';
object-src 'none';
worker-src 'none';
frame-src 'none';
base-uri 'none';
form-action 'none'
```

`unsafe-inline` is limited to the authored single-document script/style requirement.
External CDN bytes execute only from verified blob URLs. When production hosting permits
header configuration, it MUST add an equivalent or stricter HTTP CSP header; runtime
correctness does not depend on hosting headers being present.

## Error and Retry Contract

Controlled public error codes are `UNSUPPORTED_BROWSER`, `WEBGL2_UNAVAILABLE`,
`DEPENDENCY_TIMEOUT`, `DEPENDENCY_NETWORK`, `DEPENDENCY_REDIRECT`, `DEPENDENCY_SIZE`,
`DEPENDENCY_INTEGRITY`, `DEPENDENCY_IMPORT`, and `DEPENDENCY_SHAPE`.

The error view MUST:

- stop application construction and leave flight input inactive;
- name the affected library and give a safe action without showing a URL response body,
  stack trace, source text, local path, or raw exception;
- provide one semantic Retry button;
- perform no automatic retry loop;
- discard response buffers, blob URLs, partial module namespaces, listeners, renderer,
  and scene state from the failed attempt before an explicit retry;
- retry the same exact three URLs and hashes only.

## Privacy and Input Boundary

- No credential mode other than `omit` is allowed for CDN requests.
- No cookies, storage, service worker, beacon, telemetry, user account, geolocation,
  clipboard, camera, microphone, or sensor API is used.
- URL query, path suffix, fragment, referrer, and browser storage cannot select seed,
  quality, dependency URL, code path, visible text, or test mode.
- `navigator.webdriver` may expose the frozen local test facade but never changes
  production behavior in a non-automated browser.

## License Record

The implementation MUST embed the copyright/license notices for Three.js and
simplex-noise in an `index.html` comment and record the reviewed source URLs, versions,
hashes, date, and MIT license files in `evidence/dependency-manifest.json`. The full MIT
license notices remain available in source control even though no extra runtime file ships.

## Verification

Automated checks MUST prove:

- successful load performs only the document plus the three allowed requests;
- each URL/version/hash/byte count matches this table, the reviewed ESM graph has no
  unexpected import, `require()`, or `module.exports` dependency, and its namespaces have the
  required exports;
- redirect, timeout, HTTP error, truncated body, oversized body, one-bit mutation, parse
  failure, and missing export all fail closed;
- Retry does not duplicate listeners, UI, renderer, scene, or requests beyond its new set of three requests;
- query/fragment/storage values do not change behavior or appear in trusted UI;
- no source-map, addon, favicon, analytics, or asset request occurs.
