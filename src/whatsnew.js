/**
 * What changed, shown once, on the version it changed in.
 *
 * ⚠️ RADIANT UPDATES ITSELF, WHICH MEANS FEATURES ARRIVE WITH NO ANNOUNCEMENT AT
 * ALL. The app downloads a release in the background and installs it on quit, so
 * the next launch is simply a different program — dictation, a browser extension
 * and a rewritten status badge all appeared this way in one afternoon and the only
 * place that said so was a Read me nobody opens unprompted. Tony: "there should be
 * a splash screen after an update with new features so users are aware what's new."
 *
 * ⚠️ THIS IS A SECOND LIST THAT CAN DRIFT FROM THE CODE, exactly like the Read me,
 * so it is checked the same way: scripts/test-whatsnew.mjs fails when the version in
 * package.json has no entry here. A release that adds a feature and forgets to say
 * so does not build.
 *
 * Newest first. Keep each item to a sentence someone would actually read while
 * waiting to get on with their work — the Read me is where the detail lives.
 */
export const WHATS_NEW = [
  {
    version: '0.9.37',
    items: [
      ['Approval details stay reviewable', 'Approval cards keep structured arguments visible, stay readable in light and dark themes, and keep the action buttons reachable for long payloads.']
    ]
  },
  {
    version: '0.9.36',
    items: [
      ['Approval cards show complete tool details', 'Permission requests now show shell commands and every structured argument in a readable, highlighted code block. File reads are no longer blank or mislabeled as running inside the workspace.']
    ]
  },
  {
    version: '0.9.35',
    items: [
      ['Approval cards show what will run or be read', 'Permission requests now show shell commands and file paths in a readable code-style block, so a file read is never mistaken for an empty command.']
    ]
  },
  {
    version: '0.9.34',
    items: [
      ['Version details work with a keyboard too', 'Focus the sidebar version to read the same Radiant engine and connected-server details without a mouse. Remote labels now say which Mac is connected instead of assigning its build to this window.'],
    ]
  },
  {
    version: '0.9.33',
    items: [
      ['Remote version details stay visible', 'The engine-version tooltip remains readable even when the sidebar is connected to another Mac or narrowed to its smallest width.'],
    ]
  },
  {
    version: '0.9.32',
    items: [
      ['Version labels stay truthful', 'The sidebar and About page now identify the Allegretto build that rendered them, even when a stale connected server answers API requests. Hover the sidebar version to see the separately recorded Radiant engine version.'],
    ]
  },
  {
    version: '0.9.31',
    items: [
      ['See what the model saw', 'Every completed reply now has a small expandable record of the model, tools, context size, cache use and what was sent. It makes a long or surprising answer easier to understand without rerunning it.'],
    ]
  },
  {
    version: '0.9.30',
    items: [
      ['A maintenance update', 'This update adds no new controls; it keeps agency update checks clear and reliable before a build is published.']
    ]
  },
  {
    version: '0.9.29',
    items: [
      ['Sheets finish their closing motion', 'Phone sheets now wait for their visible closing motion to finish before leaving the screen.']
    ]
  },
  {
    version: '0.9.28',
    items: [
      ['Removing a phone model leaves the Models screen usable', 'Removing the current model now closes its detail sheet cleanly and Home stops offering weights that are no longer installed. Your conversations stay on the phone.']
    ]
  },
  {
    version: '0.9.27',
    items: [
      ['Slow local replies stay visible after the answer is done', 'Optional memory housekeeping now continues separately, so a slow Ollama or LM Studio server does not make a completed reply look stuck.'],
      ['Connected services join only when a message needs them', 'MCP tools stay out of unrelated messages, which keeps requests smaller and makes connected services easier to reason about.'],
      ['Long Claude subscription work uses prompt caching', 'Repeated context can be served from the provider cache instead of being sent at full price every time.'],
      ['Your answer to an agent question stays in the conversation', 'When an agent pauses for a decision, your answer now appears where the question happened instead of disappearing into a collapsed tool row.']
    ]
  },
  {
    version: '0.6.234',
    items: [
      ['A Templeton theme', 'Sage green and warm tan, saved as a theme with light, medium and dark versions.'],
      ['The accent picker uses the color you picked', 'Picking white gave you tan — it was reading only hue and vividness, and drawing the accent at a fixed lightness.'],
      ['No more black bar at the top of the window', 'Your background color now reaches the window controls.']
    ]
  },
  {
    version: '0.6.233',
    items: [
      ['The accent color picker works again', 'Picking your own accent quietly reverted to Radiant blue every time. The swatch showed your color; the app ignored it.'],
      ['Appearance is less cluttered', 'Background tint and the new background/text pickers do the same job two ways, so only the one in effect is shown.']
    ]
  },
  {
    version: '0.6.232',
    items: [
      ['Pick your own background and text color', 'Settings › Appearance. Two color wells, independent of the accent — a warm grey page under a blue accent is now possible. It warns you if a pairing would be hard to read, and still applies it.']
    ]
  },
  {
    version: '0.6.231',
    items: [
      ['Radiant says what is new', 'After it updates itself, the first launch shows a short list of what changed — once, and never on a fresh install.'],
      ['Updating shows real progress', 'The progress bar was being sent to a different window than the one you were watching, so it sat at 0% and looked frozen.']
    ]
  },
  {
    version: '0.6.227',
    items: [
      ['The agent can work in your own Chrome', 'A small extension, installed once from Settings › Automation. The agent can then see your open tabs, read and photograph the page you are on, click things by name and fill in fields — signed in as you.']
    ]
  },
  {
    version: '0.6.225',
    items: [
      ['You can tell working from stuck', 'The badge beside the agent’s name says what it is doing and for how long, and turns red if nothing has happened for 25 seconds.'],
      ['A turn that ends with nothing says so', 'Instead of leaving blank space that looked like Radiant had lost your message.']
    ]
  },
  {
    version: '0.6.223',
    items: [
      ['Dictate instead of typing', 'A Dictate button under the message box. It uses your Mac’s own speech recognition and never sends audio anywhere.']
    ]
  },
  {
    version: '0.6.221',
    items: [
      ['Follow-ups go to the chat you typed them in', 'Typing while an agent worked and then switching chats used to deliver the message to the wrong conversation.'],
      ['Turns say why they stopped', 'A turn that hit its limit of 30 rounds of tool use said so, then erased it. That note now stays.']
    ]
  }
]

/**
 * Which entries to show, given what this device last saw.
 *
 * ⚠️ A FRESH INSTALL MUST SHOW NOTHING. Greeting somebody who has never used
 * Radiant with four releases of changes to features they have not met is worse than
 * silence — so no record of a previous version means "remember this one and say
 * nothing".
 *
 * ⚠️ AND IT IS EVERYTHING SINCE, NOT JUST THE NEWEST. Updates install on quit and
 * several can pass while a laptop is shut, so jumping 0.6.221 → 0.6.227 must show
 * all four, not only the last one.
 */
export function whatsNewSince (seen, current, entries = WHATS_NEW) {
  if (!current) return []
  if (!seen) return []                          // first run on this device
  if (cmpVersion(seen, current) >= 0) return [] // same version, or an older build
  return entries.filter(e =>
    cmpVersion(e.version, seen) > 0 && cmpVersion(e.version, current) <= 0)
}

/** Compares 1.2.3-style versions numerically: 0.6.9 is older than 0.6.10. */
export function cmpVersion (a, b) {
  const pa = String(a).split('.').map(n => parseInt(n, 10) || 0)
  const pb = String(b).split('.').map(n => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0)
    if (d) return d < 0 ? -1 : 1
  }
  return 0
}
