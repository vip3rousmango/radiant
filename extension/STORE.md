# Allegretto Browser Bridge — internal distribution guide

**Name:** Allegretto Browser Bridge

**Summary (132 max):**
Lets the Allegretto agent work in the Chrome you are already signed into — your tabs, your logins, on your own Mac.

**Description:**
Allegretto is a local coding assistant that runs on your Mac. This extension is the
bridge between it and your browser.

With it installed, Allegretto can list your open tabs, read and screenshot the page
you are looking at, click things by name, and fill in fields — as you, in the
browser where you are already signed in, instead of a fresh empty browser with none
of your sessions.

**Privacy — why the permissions are what they are:**
- The extension talks to one address and no other: 127.0.0.1, on your own machine.
  It has no server, sends no analytics, and makes no outbound request to anything
  on the internet.
- Host access to all sites is required because the agent works on whatever page you
  ask it about. Nothing is read unless Allegretto, running on your Mac, asks for it.
- Nothing is stored by the extension. It holds no page content, no history and no
  credentials.
- Quitting Chrome, quitting Allegretto, or removing the extension unplugs it
  completely. There is nothing to revoke.

**Single purpose:** connect the locally-running Allegretto app to the user's browser
so it can act on pages at the user's request.

## Current distribution

The current release is for **internal agency distribution** by Virtually(Creative).
Share the reviewed extension package through the agency's approved internal
distribution process. This is not a public Chrome Web Store release, and this
guide must not be represented as one.

The package is built by `node scripts/pack-extension.mjs`. Its existing package
filename is kept for packaging compatibility:

- Package: `release/radiant-extension-<version>.zip` (legacy filename only)
- Icon: already inside the package at 16/32/48/128

For an internal install, use the approved package and the agency's documented
Chrome **Load unpacked** procedure. Do not send users to a public listing or claim
that an "Add to Chrome" listing is available.

## Privacy review for internal distribution

Keep these technical answers with the package when it is distributed:

- **Single purpose:** connect the locally-running Allegretto app to the user's
  browser so it can act on pages at the user's request.
- **`tabs`:** list the user's open tabs and act on the one they name.
- **`scripting`:** read the page's text and click or fill a field, on request.
- **`activeTab`:** act on the tab the user is looking at.
- **`alarms`:** reconnect the service worker, which Chrome stops when idle.
- **Host access (`<all_urls>`):** the agent works on whatever page the user asks
  about, which could be any site, so it cannot be narrowed in advance. Nothing is
  read unless the locally-running Allegretto app asks.
- **Data usage:** none. The extension collects no personally identifiable
  information, health, financial, authentication, personal communications,
  location, history or activity data. It stores no page content, history or
  credentials.

The extension connects only to `127.0.0.1`, does not run a server, sends no
analytics, and makes no outbound internet request. Quitting Chrome, quitting
Allegretto, or removing the extension disconnects it completely.

## Future public-store review

If Virtually(Creative) later approves a public Chrome Web Store submission, prepare
a separate listing review from this copy. Confirm the publisher account, public
homepage, privacy-policy URL, screenshots, package filename, and distribution
visibility at that time. Until that approval and submission happen, there is no
public listing URL, no public "Add to Chrome" link, and no claim of Chrome Web
Store publication.
