# Radiant — read this first, every turn

## Allegretto agency fork

Allegretto is the agency fork of Radiant. The source relationship is one-way:
pull updates from the main Radiant package, adapt and test them here, then ship
Allegretto changes from the agency fork. The main Radiant repository is never a
destination for Allegretto work, and Allegretto is never published as a Radiant
release.

The agency fork is the only Git remote that receives Allegretto commits. Keep
the main package remote fetch-only. Develop every change on a feature branch.
The agency `master` branch is merge-only: land completed work through a reviewed
pull request after verification. When the agency website is requested, deploy
only to `allegretto.netlify.app`; the future public domain is
`allegretto.virtuallycreative.ca`. Use the existing Allegretto logo baseline
and Zen color assets; do not substitute Radiant branding.


## THE iPHONE APP — 1.1 (build 21) READY FOR SALE, approved 2026-09-18

⚠️ **STILL READ APP STORE CONNECT BEFORE YOU TRUST THIS.** `node
scripts/asc.mjs get 6804891721` prints the live state in one line; this
heading has gone stale three times. 1.0 (build 7) was approved 2026-09-16; 1.1
(build 21) was submitted 2026-09-17 from the command line (`asc.mjs submit`)
and approved the next morning with no questions.

**1.1 carries:** Hugging Face search with a run/won't-run verdict (unfiltered
— TG-454, do not reinstate a word filter), Archive on chats, the keyboard fix,
the unsent-message fix (TG-467), the byline link to templetontech.com, and an
age rating of 17+ — answered honestly for an open model list. `CURRENT_PROJECT_VERSION`
is 21; the next upload must be higher.

**The next build is an update:** a new version number in App Store Connect
(`asc.mjs new-version`), its own what's new, its own review. Screenshots are
still 1.0's — replace them with the next submission (`asc.mjs shots` counts
them). `scripts/asc.mjs` can do everything short of signing in.

**Anything to do with the submission: use the `app-store-review` skill**
(`.claude/skills/app-store-review/`, also installed at `~/.claude/skills`;
published at https://github.com/templetongroup/app-store-review — the repo is
the copy people install, so a change here goes there too). It is the whole
adventure — both rejections, the TestFlight false alarm, the privacy Publish
button, the two-button resubmit — turned into a protocol.

**The catalogue is published, not only compiled in.** `apps/ios/catalog.json` is
fetched at launch and applied over the built-in Swift array, so a broken row can
be corrected in minutes instead of a review cycle. It is GENERATED from that
array (`npm run catalog:export`), so the two cannot drift, and every failure
falls back to what shipped.

⚠️ **That also means a bad publish reaches every phone at once.** `npm run
catalog:publish` runs the export, then `scripts/catalog-check.py`, which probes
every repo and refuses on undeclared quantization, a size more than 10% off the
real blob total, or a 404. Do not copy catalog.json to the website by hand.
**Before any future submission, run `npm run catalog:check`.** It fails any repo
under ~1.2 bytes per parameter that declares no quantization — the Gemma 4
defect, which shipped because the old check only asked whether MLX implemented
the architecture.


## Written is not shipped

Every Allegretto change closes these in the same turn:

1. **Agency Git** — commit and push feature branches only to the agency fork;
   merge into its `master` through a pull request. Pull from the main Radiant
   package when updating the base; never send Allegretto commits back to the
   main package.
2. **The in-app Read me** — update the `GUIDE` array in
   `src/components/Settings.jsx` whenever a user-facing feature changes. Write
   it for someone using Allegretto, in plain US English.
3. **Agency tracking** — record shipped work in the agency's Linear project when
   access is available. If access is unavailable, report the exact blocker; do
   not substitute a Radiant issue or pull request.

Before calling an Allegretto change shipped, run the objective ship check:

```bash
node scripts/ship-check.mjs
```

It verifies the committed and pushed feature-branch state, the in-app Read me,
the release marker when one is required, and the fifth gate, **judged**:
`scripts/ship-judge.mjs` has Jev (the decision model in `server/decide.js`) read the
commit message and any new Read me entries and judge whether they explain why
the change matters and are written for someone using the app. Below 50% fails;
if the judge is unreachable, the check passes and reports that.
Rewrite entries in plain words and commit again when it flags them. The check
does not override the agency rules above: push only to
the agency fork, and merge into agency `master` only through review.

New agency GitHub issues are triaged by `scripts/triage.mjs`, run by
`.github/workflows/triage.yml`. It proposes app, kind, severity, and possible
duplicate labels with probabilities; nothing below 60% confidence (or 90% for
duplicates) is applied. Inspect closed-issue recommendations without changing
them with:

```bash
node scripts/triage.mjs --closed --dry-run
```

Use the resulting labels as triage input, not as a substitute for recording
shipped work in the agency's Linear project.


## Agency publication

The public destination for Allegretto is the agency website only:
`allegretto.netlify.app`, with `allegretto.virtuallycreative.ca` as the planned
custom domain. Do not create a Radiant GitHub release, upload Radiant release
assets, or update the Radiant download page for Allegretto work.

Before a website deployment, verify the agency logo baseline, Zen colors,
version text, download links, and the live Netlify URL. A packaged Mac build is
an agency artifact for testing or release only when the agency signing and
publishing prerequisites are present; never claim a release from an unsigned
or incomplete build.

After an agency artifact has actually shipped, prune local build output with
`scripts/prune-releases.sh`. It keeps the version just shipped and the two
newest iOS archives; this is local cleanup only. Run it only after confirming
the signed agency artifact and the agency publication are complete, and never
treat pruning as creating or uploading a Radiant release.


## Sharp edges

- **Model calls go through `server/net.js` (`modelFetch`), never bare `fetch`.**
  Node's fetch is undici with 300 s headers/body timeouts; a local 27B can be
  silent longer than that while it loads and reads a prompt, and the round
  died with `TypeError: terminated`. `scripts/test-slow-model.mjs` refuses a
  bare fetch on a provider round. Cancellation is the turn's AbortSignal.
- **An empty round is nudged once, then halted with a reason** (providers.js,
  `emptyRounds`); `finish_reason: length` is announced; `<tool_call>` written
  as text is parsed. `scripts/test-empty-turn-live.mjs` drives all four shapes
  through the real server against a scripted provider.

- **Voice conversations are opt-in and the key is server-side.** `src/voice.js`
  (WebRTC to GPT-Live from the renderer) and `server/voice.js` (creates the
  session with an OpenAI *API key* — a ChatGPT sign-in cannot; `voiceKey()`
  takes any key on the OpenAI roster). Client delegation only: the thinking is
  always Radiant's own turn. Nothing runs unless `settings.voice.enabled`.
  `scripts/test-voice.mjs` covers everything short of a microphone; the
  in-app Browser pane blocks the mic, so an end-to-end check needs the
  packaged app.

- **Two icons, not one.** `build/icon.png` + `build/icon.icns` is the Mac Dock
  icon and copies AiOS's geometry (body 0.896 of canvas, swirl 0.678, measured
  off `~/Projects/aios-claude/mac/icon-1024.png`). The web/iOS set —
  `public/favicon.png`, `public/apple-touch-icon.png`, `public/icon-{192,512}.png`,
  `src/assets/logo-mark.png` — is **full-bleed and signed off; do not change it.**
  `scripts/make-icon.py` writes only the Mac icon unless you pass `--web`.
- **Colors live under `:root[data-mode=…]`**, applied from the config. A device
  that has not signed in never gets a config, so anything that renders before
  auth must work with the mode restored from localStorage in `index.html`.
- **Remote devices** authenticate with a token (Settings → Devices & sharing),
  held in an httpOnly cookie so a phone stays signed in. Loopback is always
  allowed, so test the gate over the Tailscale address, never `127.0.0.1`.
- **`~/.radiant/config.json` has one writer, the server.** Window geometry lives
  in `~/.radiant/window-state.json` precisely to avoid racing it.
- The updater stages a download in `~/Library/Caches/radiant-updater/pending`
  and installs it on quit. It must always hold the newest release or the user
  gets walked up one version at a time.

## The iPhone app

`apps/ios` is a real Capacitor shell around a **separate** UI in `src/mobile`.
It shares no styling with the desktop build: `App.jsx` lazy-imports
`mobile/Phone.jsx` only when `window.Capacitor.isNativePlatform()` is true, so
`mobile.css` and the whole tree stay out of the Mac bundle's entry chunk. Keep
it that way — check `vite build` still emits a separate `Phone-*.js` chunk.

**Every iOS build goes to every device.** Standing instruction from Tony
(2026-09-10): *"when you create new builds to the ios version, i want you to
update it on all devices."* A dev install only changes when someone pushes a
new one to that device, so a build that lands on one phone leaves the others
on last week's code with no way to tell. One command does the whole job —
web bundle, sync, build once, install on every paired device that answers:

```bash
scripts/ios-install-all.sh
```

It lists the devices that did not answer (off, asleep, not on this network)
at the end; run it again when they are. Devices today: iPhone 17 Pro Max,
iPad Pro 11, iPad mini (A17 Pro). All are on the paid team's profile, which
lasts a year — not the seven days a free Apple ID gets.

⚠️ `npx cap sync ios` REWRITES `CapApp-SPM/Package.swift` and drops the MLX and
HuggingFace packages (TG-221); the next build fails with "unable to resolve
module dependency: 'Cmlx'". The script restores the file from git after every
sync. If you sync by hand, `git checkout -- apps/ios/ios/App/CapApp-SPM/Package.swift`.

**Building it takes two non-obvious flags.** Plain `xcodebuild` fails twice:

```bash
cd apps/ios && xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  -configuration Debug CODE_SIGNING_ALLOWED=NO \
  -skipPackagePluginValidation -skipMacroValidation build
```

- Without `-skipPackagePluginValidation`, it dies on "Validate plug-in CudaBuild
  in package mlx-swift" — an unapproved build-tool plugin, normally a GUI trust
  prompt.
- Do **not** pass `-sdk iphonesimulator`. It forces the host toolchain to that
  SDK and MLX's macro target then cannot resolve SwiftSyntax.

**A Debug build's code is not in `App.app/App`.** That is a 40 KB launcher stub;
the real binary is `App.app/App.debug.dylib` (~79 MB). Verify a Swift change
landed by checking the dylib, not the stub:

```bash
strings -a "$APP/App.debug.dylib" | grep -c downloadProgress
```

### Before you touch the download path

```bash
./scripts/test-download-math.sh
```

Download progress broke FOUR times in production — flatlining at 2%, starting at
100%, showing no number at all, and reporting a stopped download as a finished
model. Every one was pure arithmetic or a folder name. None of it needed MLX, a
simulator, or a phone. But it lived inside a plugin that cannot even initialise
in the Simulator, so the only way to run it was to install a build on Tony's
phone and ask him to watch — which is how he ended up being the test harness for
two lines of division.

That logic now lives in `apps/ios/…/plugins/DownloadMath.swift`, which is pure:
values in, values out, no filesystem, no network, no UIKit. `LocalModels.swift`
calls it and holds no copy. Each shipped bug has a named case in
`scripts/test-download-math.swift`.

Run it before and after any change to downloading, and add a case the moment
something breaks again — before fixing it. If a change to the download path
cannot be expressed as a failing case there, that is a signal the logic is in the
wrong place, not that the test is unnecessary.

**MLX cannot run in the iOS Simulator — the app aborts.** Anything that touches
the model engine (download, generate) dies in `mlx::core::metal::Device::Device()`
with SIGABRT the moment it initialises Metal; the simulator has no GPU MLX will
accept. The app then vanishes and the simulator falls back to whatever was
behind it, which looks like a UI bug and is not one. Read the real reason in
`~/Library/Logs/DiagnosticReports/App-*.ips`.

So the simulator is good for **layout, navigation, first run and accessibility
only**. Any claim about downloading or generating has to be made on a physical
iPhone — build with `-destination 'id=<udid>'`, `DEVELOPMENT_TEAM=5VY66S6G3M`,
`-allowProvisioningUpdates`, then `xcrun devicectl device install app`. Do not
write "verified in the Simulator" about a model actually running.

**Previewing the phone UI without a device.** The native gate means a browser
shows the desktop app. Serve `dist/` with a script that defines
`window.Capacitor` — `isNativePlatform`, `getPlatform`, `nativePromise`,
`addListener` — before the bundle loads, and the phone UI renders at 375×812.
Match the real contracts or you will chase ghosts: sizes are **`sizeGB`** (not
bytes), disk comes from `Device.getInfo().realDiskTotal/realDiskFree`, and the
download events are **`downloadStarted` / `downloadProgress` / `downloadDone` /
`downloadFailed`**. Note a hidden browser pane suspends rAF and clamps
`setTimeout` to ~1s, so screen-push animations never settle and stubbed
progress loops crawl — neither is an app bug.

- **Type on the phone: two rules that have each cost a whole review cycle.**
  1. `-apple-system` and `ui-monospace` are system-font **keywords**. Declare
     them literally — the stack lives on `.is-native body` and everything else
     inherits it. Never put one behind a custom property; `grep -r -- '--rx-font'
     src/mobile` must come back with only the comment that says so.
  2. **`-apple-system-body` is 17px in the app and 16px in mobile Safari** on the
     same simulator — Safari steps web system text down one notch. So the
     `--rx-dt` Dynamic Type probe divides by **17**, and any measurement taken in
     the browser preview above will be one notch small and wrong for the build.
     Body-scale roles use the `font: -apple-system-*` shorthands directly (they
     resolve to UIKit's real 17/17/15/13/12/11 here, which is free Dynamic Type);
     large title, title 2, title 3 and the mono readouts are typed out and scaled
     by `--rx-dt`.

- **Every control in `src/mobile` is a `div`**, so `usePress` carries the
  semantics: `role`, `tabIndex`, `aria-label`, and Enter/Space. Use it for
  anything tappable and pass `label` for an icon-only control. Do not
  reintroduce `outline: none` on `:focus-visible` — it never matches a tap, and
  a phone can have a keyboard, Full Keyboard Access or Switch Control.

## Rating work — the star system

`.claude/skills/star-system/` is vendored from
https://github.com/templetongroup/star-system. Run it when Tony says "rate this"
or "run the star system" after a deliverable, and follow it exactly: ask for the
1–5 rating, never assign one yourself, never argue with it, ask fewer questions
the higher it is, log the round in `ratings.md`, and loop until it reaches 4+.

`ratings.md` at the repo root is the record. Read its **Gold Standards** section
before building anything in an area that already has one — that is the bar for
that area, set by Tony, and new work is measured against it.
