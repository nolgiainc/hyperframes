<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo/dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/logo/light.svg">
    <img alt="HyperFrames" src="docs/logo/light.svg" width="300">
  </picture>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/hyperframes"><img src="https://img.shields.io/npm/v/hyperframes.svg?style=flat" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/hyperframes"><img src="https://img.shields.io/npm/dm/hyperframes.svg?style=flat" alt="npm downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D22-brightgreen" alt="Node.js"></a>
  <a href="https://discord.gg/EbK98HBPdk"><img src="https://img.shields.io/badge/Discord-Join-5865F2?logo=discord&logoColor=white" alt="Discord"></a>
</p>

<p align="center"><b>Write HTML. Render video. Built for agents.</b></p>

<p align="center">
  <a href="https://hyperframes.heygen.com/quickstart">Quickstart</a> |
  <a href="https://hyperframes.heygen.com/showcase">Showcase</a> |
  <a href="https://www.hyperframes.dev/">Playground</a> |
  <a href="https://hyperframes.heygen.com/catalog/blocks/data-chart">Catalog</a> |
  <a href="https://hyperframes.heygen.com/introduction">Docs</a> |
  <a href="https://discord.gg/EbK98HBPdk">Discord</a>
</p>

<p align="center">
  <img src="docs/public/images/hyperframes-logo-motion-1280-trimmed.webp" alt="HyperFrames demo: HTML code on the left transforms into a rendered video on the right" width="800">
</p>

HyperFrames is an open-source framework for turning HTML, CSS, media, and seekable animations into video. It is the rendering core behind hosted authoring workflows, an agent-friendly CLI, and a browser Studio.

> **Nolgia fork:** this repository is [`nolgiainc/hyperframes`](https://github.com/nolgiainc/hyperframes), a maintained fork of [`heygen-com/hyperframes`](https://github.com/heygen-com/hyperframes). Product identity, package names, and upstream documentation remain HyperFrames/HeyGen. Fork-owned browser-runtime artifacts and their release/consumer checklist are documented in [NOLGIA.md](NOLGIA.md); do not assume an upstream npm package or CDN contains those fork-only artifacts.

## Quick start

### With an AI coding agent

Install the current skills from the repository, then start with `/hyperframes`:

```bash
npx skills add heygen-com/hyperframes --full-depth --yes
```

`--full-depth` clones the current repository instead of using the skills.sh registry snapshot. The router guides an agent through planning, HTML composition, seekable animation, media, linting, preview, and rendering. It works with coding agents that support the skills format, including Claude Code, Cursor, Gemini CLI, and Codex.

### Manually with the CLI

The published `hyperframes` CLI needs Node.js 22+ and FFmpeg for local video encoding. `init` opens a wizard on an interactive TTY; use explicit flags and `--non-interactive` in CI or agent runs:

```bash
npx hyperframes init my-video --example blank --non-interactive
cd my-video
npx hyperframes lint
npx hyperframes preview --no-open   # local Studio with live reload
npx hyperframes render --output renders/output.mp4
```

Use `--skip-skills` or `HYPERFRAMES_SKIP_SKILLS=1` when a fully offline scaffold is required. `npx hyperframes doctor` reports the Node.js, FFmpeg/FFprobe, Chrome, and Docker capabilities available to the CLI.

## CLI and Studio

The CLI and Studio are complementary surfaces:

- `hyperframes init` scaffolds a project, optionally importing media and selecting a template.
- `hyperframes preview` starts the embedded Studio server and opens the project in a browser. It defaults to port 3002; `--no-open`, `--port`, `--list`, and `--kill-all` make it scriptable.
- `hyperframes lint`, `validate`, and `inspect` cover static structure, a headless-browser runtime/contrast pass, and timestamped layout checks respectively.
- `hyperframes render` captures frames and encodes MP4, WebM, MOV, GIF, or PNG sequences. `--docker` selects the reproducible Docker path; `--workers` controls parallel capture.
- `hyperframes catalog` lists registry items (table by default, JSON for automation, or `--human-friendly` for an interactive picker); `hyperframes add <name>` installs one.
- `hyperframes cloud`, `lambda`, and `cloudrun` are the managed, AWS, and GCP render surfaces described below.

Studio is the browser editor package (`@hyperframes/studio`) used by `preview`; it is not a second renderer. Contributors can run the workspace Studio directly with `bun run dev` (Vite serves it on port 5190) while the CLI preview remains the normal project workflow.

## Agent workflow and composition contract

Compositions are ordinary HTML files. The root element declares a finite canvas; media and visual elements use `data-start`, `data-duration`, `data-track-index`, and `class="clip"`; seekable animation timelines are paused and registered on `window.__timelines`.

```html
<div id="stage" data-composition-id="launch" data-start="0" data-width="1920" data-height="1080">
  <h1 id="title" class="clip" data-start="1" data-duration="4" data-track-index="1">Launch day</h1>
  <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
  <script>
    const tl = gsap.timeline({ paused: true });
    tl.from("#title", { opacity: 0, y: 40, duration: 0.8 }, 1);
    window.__timelines = window.__timelines || {};
    window.__timelines.launch = tl;
  </script>
</div>
```

The example pins GSAP to the version used by the blank template. A composition's finite duration comes from its registered timeline. Prefer local, versioned assets for production and CI; render-time network fetches, wall-clock APIs (`Date.now()`, `requestAnimationFrame`, and unseeded timers), and unseeded randomness undermine reproducibility. Output parameters such as FPS and dimensions are fixed before capture.

## Rendering targets

Choose the target that matches your workflow. Cloud accounts, billing, credentials, and deployment side effects are prerequisites for the managed targets; they are not part of a local smoke test.

| Target               | Command or package                                                                                                                 | What it provides                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Local                | `hyperframes render`                                                                                                               | Fast authoring loop using headless Chrome and FFmpeg on the current machine.              |
| Docker               | `hyperframes render --docker`                                                                                                      | A pinned Chrome/font/FFmpeg environment for the closest local reproducibility.            |
| HeyGen managed cloud | `hyperframes auth login` then `hyperframes cloud render`                                                                           | Upload, render, poll, and download without operating Chrome or FFmpeg; billed per credit. |
| AWS                  | `hyperframes lambda deploy` / `hyperframes lambda render`; [`@hyperframes/aws-lambda`](packages/aws-lambda/package.json)           | Bring-your-own AWS distributed rendering with S3 and Step Functions.                      |
| Google Cloud         | `hyperframes cloudrun deploy` / `hyperframes cloudrun render`; [`@hyperframes/gcp-cloud-run`](packages/gcp-cloud-run/package.json) | Bring-your-own Cloud Run + Workflows rendering with Google Cloud Storage.                 |

For local renders, frozen assets, dependencies, fonts, browser, FFmpeg, and environment are part of the reproducibility boundary. Docker narrows those variables; a non-Docker run can still differ across operating systems because of platform font and Chrome behavior. See [Deterministic Rendering](docs/concepts/determinism.mdx), [Cloud Rendering](docs/deploy/cloud.mdx), [AWS Lambda](docs/deploy/aws-lambda.mdx), and [Google Cloud Run](docs/deploy/gcp-cloud-run.mdx) before running a cloud command.

## What you can build

HyperFrames supports product launches, PR walkthroughs, data visualizations, social clips with captions and music, docs/website explainers, and reusable motion graphics. Browse the [Showcase](https://hyperframes.heygen.com/showcase) for projects you can watch and remix.

The tracked registry currently contains 100+ blocks and 25 components. Counts change as the catalog grows; use [`registry/blocks`](registry/blocks), [`registry/components`](registry/components), and the [online catalog](https://hyperframes.heygen.com/catalog) as the authoritative inventory.

Optional integrations can import Figma assets, tokens, and storyboard frames as reconstructed motion (frames are states, not static slides); keep those integrations on their own dependency and credential boundary.

## HyperFrames stack and packages

The repository is a Bun workspace. The root [workspace manifest](package.json) and each linked package manifest are the authoritative package inventory; the family summary below intentionally avoids copying a second, exhaustive list.

| Family               | Stable surface                           | Manifest sources                                                                                                                                              |
| -------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authoring            | CLI, Studio, and SDKs                    | [`@hyperframes/cli`](packages/cli/package.json), [`@hyperframes/studio`](packages/studio/package.json), [`@hyperframes/sdk`](packages/sdk/package.json)       |
| Composition runtime  | Core types/runtime, parsers, and linting | [`@hyperframes/core`](packages/core/package.json), [`@hyperframes/parsers`](packages/parsers/package.json), [`@hyperframes/lint`](packages/lint/package.json) |
| Local rendering      | Capture engine and producer/encoder      | [`@hyperframes/engine`](packages/engine/package.json), [`@hyperframes/producer`](packages/producer/package.json)                                              |
| Integrations         | Distributed AWS and GCP adapters         | [`@hyperframes/aws-lambda`](packages/aws-lambda/package.json), [`@hyperframes/gcp-cloud-run`](packages/gcp-cloud-run/package.json)                            |
| Playback and effects | Embeddable player and shader transitions | [`@hyperframes/player`](packages/player/package.json), [`@hyperframes/shader-transitions`](packages/shader-transitions/package.json)                          |

Other workspace packages, including `@hyperframes/studio-server`, are listed in `packages/*/package.json` and published according to their own manifests.

## Catalog

Install a registry item into a project with the CLI:

```bash
npx hyperframes catalog                  # parseable table
npx hyperframes catalog --json           # machine-readable inventory
npx hyperframes add flash-through-white  # install a shader transition
```

## Why HyperFrames?

- **HTML-native:** no React requirement or proprietary timeline format.
- **Agent-friendly:** plain HTML, explicit flags, JSON-capable diagnostics, and a documented `--non-interactive` path for commands that otherwise prompt.
- **Seek-driven:** the renderer positions every frame through the runtime adapter rather than relying on real-time playback.
- **Adapter-based animation:** use GSAP, CSS, Lottie, Three.js, Anime.js, WAAPI, or a custom frame adapter.
- **Open source:** Apache 2.0, with the package and deployment surfaces defined in tracked manifests.

## HyperFrames vs. Remotion

HyperFrames is inspired by [Remotion](https://www.remotion.dev). Both render through headless Chrome and FFmpeg, but HyperFrames composes plain HTML while Remotion composes React components. HyperFrames has local, Docker, managed-cloud, AWS, and GCP adapters; choose the target that matches your infrastructure. See the [full comparison](https://hyperframes.heygen.com/guides/hyperframes-vs-remotion).

## Testing and contributing

Contributors use Bun (not pnpm) and Node.js 22+:

```bash
bun install --frozen-lockfile
bun run build
bun run verify:packed-manifests
bun run lint
bun run format:check
bun run --filter '*' typecheck
bun run test:scripts
bun run test:skills
bun run --filter '!@hyperframes/producer' test
cd docs && npx mint validate && npx mint broken-links
```

The CI tiers mirror these commands: `ci.yml` runs change-filtered build, lint, typecheck, script/package tests, skills tests, and packed-manifest checks; `regression.yml` runs Docker producer shards when core/engine/producer code changes; `docs.yml` validates Mintlify docs and schema mirrors; and dedicated Windows, CodeQL, and catalog-preview workflows cover their own triggers. A README-only change does not claim to have exercised code paths whose workflow filters do not select it.

Run `npx hyperframes lint && npx hyperframes validate && npx hyperframes inspect` on a composition before previewing or rendering it. See [CONTRIBUTING.md](CONTRIBUTING.md) for review conventions and [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

### Compatibility

Node.js 22+ is required for the CLI and workspace tools. FFmpeg and FFprobe are required for local encoding and media inspection; Docker is optional but recommended when pixel-level reproducibility matters. The CLI supports macOS, Linux, and Windows paths, while cloud adapters additionally require their provider credentials and tooling. Preview can differ from render performance, and non-Docker pixels can vary with the host Chrome and fonts even when the composition is unchanged.

## Git LFS and regression media

Golden regression-test media under `packages/producer/tests/**` is tracked with Git LFS by the patterns in [.gitattributes](.gitattributes). A clone without Git LFS may contain pointer files rather than hydrated media; install Git LFS and run `git lfs install` plus `git lfs pull` when you need local baselines. CI's regression workflow checks out with LFS enabled and verifies that the media are real files before rendering. Source-only work can skip hydration with `GIT_LFS_SKIP_SMUDGE=1`.

## Documentation and community

- [Introduction and quickstart](https://hyperframes.heygen.com/introduction) · [Rendering guide](https://hyperframes.heygen.com/guides/rendering) · [CLI reference](https://hyperframes.heygen.com/packages/cli)
- [Showcase](https://hyperframes.heygen.com/showcase) · [Catalog](https://hyperframes.heygen.com/catalog) · [Playground](https://www.hyperframes.dev/)
- Questions and ideas: [Discord](https://discord.gg/EbK98HBPdk)
- Bugs and feature requests: [GitHub Issues](https://github.com/heygen-com/hyperframes/issues)
- Community examples: [ADOPTERS.md](ADOPTERS.md)

## License

[Apache 2.0](LICENSE)
