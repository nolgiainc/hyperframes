# Nolgia runtime pipeline

`nolgiainc/hyperframes` is Nolgia's canonical source for the HyperFrames
**browser runtime** (`hyperframe.runtime.iife.js`). Upstream
(`heygen-com/hyperframes`) shut down their CDN
(`assets.hyperframes.heygen.com`, now NXDOMAIN), so every Nolgia consumer
vendors the runtime file. This document is the single place that says where
the artifact comes from, how a new one is cut, and who consumes it.

## Canonical artifact (today)

|                        |                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| File                   | `hyperframes-runtime-0.6.81.js` (built as `packages/core/dist/hyperframe.runtime.iife.js`) |
| Version                | 0.6.81                                                                                     |
| sha256                 | `39e960af006591954524e6a636fd35464af9b54408be19e567d073d94351f9dd`                         |
| Size                   | 188,987 bytes                                                                              |
| Source commit          | `4b8749c6` (`chore: release v0.6.81`) in this repo                                         |
| Also byte-identical to | npm `hyperframes@0.6.81` → `package/dist/hyperframe.runtime.iife.js`                       |

Reproducibility has been verified (2026-07): building at `4b8749c6` with
`bun install --frozen-lockfile` (esbuild pinned to 0.25.12 by `bun.lock`)
produces a byte-identical IIFE — the fork, the npm tarball, and every
vendored copy all hash to `39e960af…`.

## What lives in this repo

Bun-workspaces monorepo (`packages/*`):

- **Runtime source**: `packages/core/src/runtime/entry.ts`. The artifact
  builder is `packages/core/scripts/build-hyperframes-runtime-artifact.ts`
  (esbuild, `format: iife`, `target: es2020`, minified, no legal comments,
  trailing newline appended). It emits `dist/hyperframe.runtime.iife.js`,
  `dist/hyperframe.runtime.mjs`, `dist/hyperframe.manifest.json` (version /
  buildId / sha256), and regenerates `src/generated/runtime-inline.ts`.
- **Other packages**: `engine`, `player`, `producer`, `parsers`, `lint`,
  `cli`, `sdk`, `studio`, `studio-server`, `shader-transitions`,
  `aws-lambda`, `gcp-cloud-run`.
- **Docs site** (`docs/`, published by `.github/workflows/docs.yml`),
  **schemas** (`registry/` + `bun run sync-schemas`), **skills** (`skills/`,
  Claude-plugin skills), **release notes** (`releases/`).
- **Runtime test suite** (`packages/core`): `vitest` unit tests plus
  dedicated runtime gates — contract, behavior, seek, duration-guards,
  parity, security — all runnable via
  `bun run --filter @hyperframes/core test:hyperframe-runtime-ci`.

Fork state: `main` tracks upstream at `@hyperframes/core` **0.7.48**,
~850 commits (≈60 touching `packages/core/src/runtime`) ahead of the
0.6.81 release. HEAD builds a substantially different runtime
(sha256 `180a8262…`, 255,005 bytes) — do **not** ship a HEAD build as a
drop-in replacement for 0.6.81 without going through the release process
below and revalidating compositions.

## Cutting a Nolgia runtime release

Convention: annotated tag **`nolgia-vX.Y.Z`** on the commit to release,
where `X.Y.Z` is the runtime version. The `nolgia-` prefix deliberately
does not match upstream's `v*` tag triggers (e.g. `publish.yml`), so
cutting a Nolgia release never fires upstream's npm-publish pipeline.

1. Branch from the commit you want (fix on top of `4b8749c6` for a
   0.6.81-compatible patch, or a newer baseline if compositions have been
   revalidated), land it via PR.
2. `git tag -a nolgia-vX.Y.Z -m "Nolgia runtime X.Y.Z" <commit> && git push origin nolgia-vX.Y.Z`
3. CI (`.github/workflows/nolgia-release.yml`) builds the runtime with the
   frozen lockfile and attaches `hyperframes-runtime-X.Y.Z.js` +
   `hyperframe.manifest.json` + `SHA256SUMS` to a GitHub Release for the tag.
4. Record the sha256 from the release; update the consumer checklist below
   when you roll it out.

Manual build (identical to CI, needed only if Actions is unavailable):

```sh
git checkout nolgia-vX.Y.Z
bun install --frozen-lockfile
bun run --filter @hyperframes/core build:hyperframes-runtime
# artifact: packages/core/dist/hyperframe.runtime.iife.js
shasum -a 256 packages/core/dist/hyperframe.runtime.iife.js
cp packages/core/dist/hyperframe.runtime.iife.js hyperframes-runtime-X.Y.Z.js
```

Sanity gates before shipping: `bun run --filter @hyperframes/core
test:hyperframe-runtime-ci`.

## Consumer checklist (update every copy on a runtime change)

The filename embeds the version (`hyperframes-runtime-X.Y.Z.js`), so a bump
touches both the file and the references to it.

| #   | Consumer                          | Copy                                                                                                         | References to update                                                                                                               | Verified sha (2026-07) |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | `nolgiainc/nolgia.com` (main)     | `public/vendor/hyperframes-runtime-0.6.81.js`                                                                | `src/lib/timeline/srcdoc-builder.ts` → `VENDORED_RUNTIME_PATH` (studio preview srcdoc rewrite)                                     | `39e960af…` ✔          |
| 2   | `nolgiainc/nolgia-agent` (master) | `skills/creative/hyperframes/assets/hyperframes-runtime-0.6.81.js` (bundle scaffolding for new compositions) | `skills/creative/hyperframes/SKILL.md`, `skills/creative/hyperframes/references/nolgia-project-structure.md` (script-tag filename) | `39e960af…` ✔          |
| 2b  | `nolgiainc/nolgia-agent` (master) | `overlays/nolgia-admin/projects/hyperframes/demo/nolgia-demo/hyperframes-runtime-0.6.81.js` (demo project)   | —                                                                                                                                  | `39e960af…` ✔          |
| 3   | `nolgiainc/nolgia-api` (main)     | `cmd/hyperframes-migrate/hyperframes-runtime-0.6.81.js` (`//go:embed`)                                       | `cmd/hyperframes-migrate/rewrite.go` → `runtimeFileName`, `runtimeVersion`, and the expected-sha256 comment                        | `39e960af…` ✔          |
| 4   | Stored composition bundles (GCS)  | one runtime copy stamped into each composition bundle by `cmd/hyperframes-migrate`                           | re-run the migration after updating #3 so existing bundles pick up the new file                                                    | stamped from #3        |

**The render pipeline has no copy of its own.** `nolgia-api`'s render job
(`cmd/render`, `Dockerfile.render`) downloads the stored bundle and renders
`index.html` as-is — the runtime it executes is whatever sits inside the
bundle. New bundles get the runtime from the agent skill scaffolding (#2);
existing bundles only change when the migration (#3 → #4) is re-run. A
runtime fix that skips #4 will fix previews and new compositions but keep
rendering old compositions on the old runtime.

## Risks / notes

- Byte-reproducibility holds only with the **frozen lockfile** (esbuild
  0.25.12 at `4b8749c6`). Building with a different esbuild produces a
  functionally equivalent but differently-hashed artifact — always publish
  the hash with the artifact and compare against it, never assume.
- If the fork ever fails to reproduce a historical artifact, the npm
  tarball (`hyperframes@<version>` → `dist/hyperframe.runtime.iife.js`)
  is the fallback canonical source for that version.
- Upstream CI workflows in `.github/workflows/` are inherited from
  heygen-com and may fail on the fork (missing secrets/environments); only
  `nolgia-release.yml` is ours.
