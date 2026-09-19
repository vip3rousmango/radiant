# Repository Guidelines

## Project Overview

Allegretto is Virtually(Creative)'s agency fork of Radiant, a local-first coding harness. It combines an Electron desktop shell, a Vite/React renderer, an in-process Express/WebSocket server, native desktop helpers, a Capacitor iOS shell, and a static Netlify website.

The package identity is Allegretto (`com.virtuallycreative.allegretto`), while `radiantEngineVersion` records the upstream Radiant engine version. Upstream synchronization is one-way: fetch `templetongroup/radiant`, adapt it in this repository, and publish only agency-owned Allegretto artifacts. Never publish Allegretto as a Radiant release.

## Architecture & Data Flow

- **Desktop startup:** `electron/main.cjs` starts `server/index.js`, waits for its `ready` port promise, and opens the local HTTP app. Electron exposes only narrow native APIs through `electron/preload.cjs`; renderer Node integration is disabled.
- **Renderer:** `src/main.jsx` selects the main app, Settings window, or HUD from the URL hash. `src/App.jsx` owns desktop session/config/task state and lazy-loads `src/mobile/Phone.jsx` only on Capacitor-native platforms.
- **Transport:** `src/api.js` is the renderer/server boundary. REST handles durable resources and settings; `/api/chat` and dictation use SSE; `/term` and the browser extension use WebSockets. Vite proxies `/api` and `/term` to the backend during development.
- **Chat flow:** `/api/chat` in `server/index.js` loads config/session state, resolves provider credentials and skills, then calls `server/providers.js:runTurn`. Provider-specific wire formats become the neutral stored transcript format; normalized events stream back to `src/components/Chat.jsx`.
- **Agent execution:** tools are defined and dispatched in `server/tools.js` and `server/computer-tools.js`. Shell, file, MCP, and unsafe computer actions are approval-gated on the server. Tasks reuse the chat run path. Loops are client-pumped through `/advance`; graphs are detached server-side runs managed by `server/graph-run.js`.
- **Persistence:** `server/config.js` owns config, sessions, projects, agents, tasks, loops, and graphs. JSON writes use temporary files followed by rename. Config has one server writer; window geometry is stored separately.
- **Cancellation and failures:** turns carry an `AbortSignal`; dropped SSE connections and explicit aborts must persist a meaningful stopped/halt result, not only show a transient banner. SSE heartbeats keep quiet remote turns alive.
- **Native boundary:** `server/computer.js` selects `native/radiant-control` on macOS or `gnome/radiant-control.cjs` on Linux. macOS source is `native/RadiantControl.swift`; compile it with `npm run compile:helper`.
- **iOS:** `apps/ios` is a separate Capacitor shell around the root `dist/` bundle. Its native model UI is separate from the desktop entry chunk. The iOS model catalogue is authored in Swift and exported to JSON.
- **Website:** `website/` is independent static HTML/CSS/assets, published directly by Netlify. It is not part of the Electron or iOS build.

## Key Directories

- `src/` — React/Vite renderer, API client, desktop UI, mobile UI, themes, and native-aware entry routing.
- `server/` — Express routes, SSE/WebSocket transport, provider loops, persistence, auth, tools, updater logic, and platform adapters.
- `electron/` — Electron main process, preload bridge, updater, window state, and native window lifecycle.
- `native/` — macOS Swift helper and embedded helper metadata.
- `apps/ios/` — nested Capacitor/npm project, Xcode project, Swift plugins, and generated runtime catalogue.
- `website/` — Allegretto landing page, documentation, privacy policy, use cases, and assets.
- `scripts/` — focused regression tests, release gates, catalogue tooling, screenshots, packaging checks, and operational utilities.
- `build/` — Electron signing/notarization hook and macOS entitlements.
- `extension/` — internal Radiant Browser Bridge extension source and packaging metadata.
- `public/` — renderer static assets and web manifest.

## Development Commands

Install and run the desktop app:

```bash
npm install                 # local development
npm ci                      # reproducible CI/fresh checkout install
npm run dev                 # server :5834, Vite UI http://localhost:5833
npm run build               # production renderer in dist/
npm run app                 # build and launch Electron without packaging
NODE_ENV=production npm start
```

Build and package:

```bash
npm run compile:helper
npm run dist:allegretto:unsigned   # local arm64 DMG/ZIP; updater disabled; never publishes
npm run dist:agency                # alias for the unsigned agency build
npm run dist                      # macOS electron-builder path
npm run dist:linux                # local Linux AppImage, never publishes
node scripts/release-allegretto.mjs       # validation only
node scripts/release-allegretto.mjs --release
```

A real agency release requires an agency GitHub owner/repository, GitHub token, valid Developer ID identity, and saved `notarytool` profile. Do not treat an unsigned DMG or ignored `release/` output as a published release.

Focused checks:

```bash
node scripts/test-api.mjs
node scripts/test-contrast.mjs
node scripts/test-supply-chain.mjs
node scripts/test-packaged-imports.mjs
node scripts/test-updater-boundary.mjs
node scripts/test-allegretto-updater-feed.mjs
node scripts/test-install-location.mjs
node scripts/test-upstream-sync.mjs
node scripts/ship-check.mjs
```
- There is no lint script or lint configuration in the root package; use the targeted tests and existing build checks rather than inventing a lint command.

For the browser UI harness:

```bash
bash scripts/test-ui.sh
```

For the broad pre-iOS gate:

```bash
bash scripts/test-all.sh
```

`test-all.sh` is a sequence of focused scripts and is mobile/iOS-oriented; it is not a complete test runner for every desktop, updater, or website path.

For iOS:

```bash
npm --prefix apps/ios install
(cd apps/ios && xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -configuration Debug CODE_SIGNING_ALLOWED=NO \
  -skipPackagePluginValidation -skipMacroValidation build)
scripts/ios-install-all.sh
```

Do not pass `-sdk iphonesimulator`. The Simulator is for layout, navigation, first run, and accessibility only; MLX model download/generation requires a physical device.

## Code Conventions & Common Patterns

- Match nearby JavaScript style: ESM in `src/` and `server/`, CommonJS only for Electron entry files (`.cjs`), semicolon-free code, and small named helpers.
- Use descriptive `camelCase` names for JavaScript variables/functions and `PascalCase` for React components; preserve the repository's existing names for public events, routes, and IPC channels.
- Prefer explicit dependency objects at orchestration seams (for example `graphDeps` in `server/index.js`) and small pure helpers for transformations. Keep long-lived state in the owning layer: per-session renderer maps in `src/App.jsx`, server controllers/maps in `server/index.js`, and durable records in `server/config.js`.
- All model/provider calls go through `server/net.js:modelFetch`. Do not use bare `fetch` for a model round; slow local models need disabled Undici headers/body timeouts plus the turn `AbortSignal`.
- Keep provider-specific request conversion inside `server/providers.js`. Preserve the neutral session format (`user.text`/`attachments`; `assistant.parts` containing text/tool parts).
- Use `src/api.js` helpers (`apiUrl`, `authHeaders`, `json`, `streamChat`, and related stream helpers) from React. Do not put provider calls or credentials in renderer code, React state, or localStorage.
- Preserve server-side approval and safety checks. Plan mode blocks mutation tools both when schemas are built and when dispatch occurs; UI approval is not a security boundary.
- Use temporary `RADIANT_DIR` and `HOME` values for tests and development fixtures. Never let a test point at the installed app's real data directory.
- New REST resources belong in `server/index.js` with explicit auth/origin behavior and no-store responses. Remote clients authenticate with the token header/bearer/cookie paths already implemented there.
- Keep `contextIsolation: true`, `nodeIntegration: false`, and the narrow named bridge in `electron/preload.cjs`. Renderer code must use `window.radiantNative` for native dialogs, notifications, microphone permission, and file saving.
- Settings and HUD are separate renderer windows. Synchronize them with IPC events; do not assume they share React state.
- User-facing desktop behavior needs a plain-language entry in the `GUIDE` array in `src/components/Settings.jsx`. Run `scripts/test-readme.mjs` or `scripts/ship-check.mjs` when changing user-facing behavior.
- `apps/ios/ios/App/App/plugins/LocalModels.swift` is the catalogue source of truth. Generate `apps/ios/catalog.json` with `npm run catalog:export`, then run `npm run catalog:check`; do not hand-edit the generated JSON.
- `npx cap sync ios` rewrites `apps/ios/ios/App/CapApp-SPM/Package.swift` and can remove MLX/HuggingFace dependencies. Restore that file from Git after manual sync; `scripts/ios-install-all.sh` does this automatically.
- Keep Mac icons (`build/icon.*`) separate from web/iOS icons. Generated symbol and catalogue files should be changed through their scripts, not hand-edited.

### Repository Workflow & Guardrails

- Develop every change on a feature branch. Agency `master` is merge-only through a reviewed pull request.
- Push Allegretto work only to writable agency `origin`. Keep `upstream` pointed at `https://github.com/templetongroup/radiant.git` with a disabled push URL.
- The scheduled upstream workflow fetches upstream into `automation/sync-upstream-master`, never mutates agency `master`, never pushes upstream, and never publishes. Conflicts require semantic human resolution; do not resolve by blanket ours/theirs.
- Before calling a user-facing change shipped, update the in-app Read me, run `node scripts/ship-check.mjs`, invoke the `ship-sync` agent, and record the work as Done in Linear for team “The Templeton Group” (TG), project “Radiant”. If Linear or the agent is unavailable, report the exact blocker.
- Agency website work deploys only to `https://allegretto.netlify.app` (planned custom domain: `allegretto.virtuallycreative.ca`). Do not create a Radiant GitHub release, upload Radiant assets, or update the Radiant download page for Allegretto work.
- Some docs and legacy scripts still say Radiant. Use current package identity, build configuration, and the actual target path as the source of truth; avoid broad branding rewrites unrelated to the change.

## Important Files

- `package.json` — package identity, scripts, exact dependencies, Electron Builder targets/resources, and version metadata.
- `package-lock.json`, `.npmrc` — npm lockfile and exact-save policy.
- `vite.config.js` — backend proxy, `RADIANT_PORT`, and compile-time app/engine version injection.
- `src/main.jsx`, `src/App.jsx`, `src/api.js`, `src/components/Chat.jsx` — renderer entry, state owner, transport boundary, and streaming chat UI.
- `server/index.js` — backend composition root and API/SSE/WebSocket routes.
- `server/config.js`, `server/providers.js`, `server/tools.js`, `server/net.js` — persistence, provider loop, tools, and model transport.
- `electron/main.cjs`, `electron/preload.cjs`, `electron/updater.cjs`, `electron/updater-config.cjs` — shell, secure bridge, and update behavior.
- `scripts/release-allegretto.mjs` — authoritative agency release validation/publisher.
- `scripts/ship-check.mjs`, `scripts/ship-judge.mjs` — commit/push/readme/release-copy checks.
- `.github/workflows/sync-upstream.yml` — scheduled/manual fetch-only upstream review workflow.
- `.github/workflows/linux-release.yml` — Linux AppImage build and post-release smoke/download verification.
- `apps/ios/ios/App/App/plugins/LocalModels.swift`, `apps/ios/catalog.json`, `apps/ios/ios/App/CapApp-SPM/Package.swift` — iOS catalogue and dependency boundaries.
- `website/index.html`, `website/privacy.html`, `website/styles.css`, `netlify.toml` — static agency site and deployment configuration.
- `README.md` and `RULES.md` — user-facing installation/architecture summary and repository verification rules. Package/config files are authoritative when they disagree with legacy Radiant wording.

## Runtime/Tooling Preferences

- Use npm. The root package is ESM; Electron entrypoints are CommonJS. CI standardizes on Node 22; the Capacitor CLI requires Node 20 or newer.
- Keep dependency versions aligned with `package-lock.json`; do not introduce pnpm, Yarn, Bun, or a second lockfile.
- Vite development uses port 5833 and proxies to backend port 5834 by default. Set `RADIANT_PORT` for an isolated backend and `RADIANT_DEV_ORIGIN` when the UI runs on another origin.
- `RADIANT_DIR` selects the app data directory. Use a temporary directory for tests, smoke runs, and experiments.
- Electron packaging intentionally sets `npmRebuild: false` and unpacks native/runtime modules such as `node-pty` and `playwright-core`; preserve those packaging boundaries.
- Mac helper, signing, notarization, and iOS work require macOS native tooling. The package's `afterSign` hook handles notarization only when a valid profile is configured.
- The updater is agency-only and fail-closed: it rejects the upstream `templetongroup/radiant` target. Unsigned builds disable the packaged updater; a DMG can test manual installation, not an in-app update.
- For any App Store Connect or iOS submission work, read `.claude/skills/app-store-review/` first and query live state with `node scripts/asc.mjs get 6804891721`; do not trust the written approval/build status in this file.

## Testing & QA

There is no Jest/Vitest/Mocha/pytest suite and no root `npm test`. Tests are mostly Node ESM scripts using built-in assertions, with Playwright Core browser harnesses, Python catalogue checks, and pure Swift checks.
- There is no numeric coverage gate. For changed behavior, run the narrowest real-path regression that exercises it and add a focused regression script/case when a plausible future bug is not already covered.

- **Server/API:** `node scripts/test-api.mjs` starts the real server with throwaway data and exercises persistence and API behavior.
- **Packaged Electron:** `node scripts/test-smoke.mjs <path-to-app>` launches the actual app with isolated HOME/CDP. Pass the generated Allegretto app path explicitly; the default still names the legacy Radiant path.
- **Rendered UI:** `bash scripts/test-ui.sh` runs the Vite harness and `scripts/test-ui.mjs` in Chrome. Use the actual UI surface for interaction claims.
- **Runtime/provider regressions:** `scripts/test-empty-turn-live.mjs`, `scripts/test-slow-model.mjs`, `scripts/test-fallback-live.mjs`, `scripts/test-caching.mjs`, and `scripts/test-origin.mjs` cover streaming, cancellation, slow models, cache layout, and origin security.
- **iOS download math:** `./scripts/test-download-math.sh` is pure and must run before and after download-path changes. It needs no Simulator, model, or device.
- **Live catalogue:** `npm run catalog:check` requires network access to Hugging Face and checks reachability, size drift, and undeclared quantization.
- **Website:** Netlify serves `website/` with no build step (`netlify.toml` sets `command = "true"`). Verify changed pages, dialogs, forms, and accessibility manually on the correct Allegretto deploy/preview URL; a local static server cannot prove Netlify Forms behavior.
- **Release:** run the validation-only release command before any publish attempt. A signed release additionally needs Developer ID, notary profile, agency target, and token. Verify download assets with GET/ranged GET rather than HEAD.
