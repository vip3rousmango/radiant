const APPROVAL_TOOLS = {
  run_command: { verb: 'Run', noun: 'command', preposition: 'in', action: 'Run it', language: 'bash' },
  read_file: { verb: 'Read', noun: 'file', preposition: 'from', action: 'Read it', language: 'json' },
  write_file: { verb: 'Write', noun: 'file', preposition: 'in', action: 'Write it', language: 'json' },
  edit_file: { verb: 'Edit', noun: 'file', preposition: 'in', action: 'Edit it', language: 'json' },
  list_dir: { verb: 'List', noun: 'folder', preposition: 'in', action: 'List it', language: 'json' },
  job: { verb: 'Manage', noun: 'background job', preposition: 'on', action: 'Allow it', language: 'json' }
}

function compactPath (cwd) {
  return cwd ? String(cwd).replace(/^\/Users\/[^/]+/, '~') : ''
}

function stringifyArgs (args) {
  try { return JSON.stringify(args, null, 2) || '{}' } catch { return String(args) }
}

export function approvalPresentation (approval, cwd) {
  const name = String(approval?.name || approval?.tool || 'tool')
  const args = approval?.args && typeof approval.args === 'object' ? approval.args : {}
  const definition = APPROVAL_TOOLS[name]
  const isCommand = name === 'run_command' && typeof args.command === 'string' && args.command
  const detail = isCommand ? args.command : stringifyArgs(args)
  const location = compactPath(cwd)
  const verb = definition?.verb || 'Allow'
  const noun = definition?.noun || name.replace(/_/g, ' ')
  const question = definition
    ? `${verb} this ${noun}${location ? ` ${definition.preposition} ${location}` : ''}?`
    : `${verb} ${noun}?`

  return {
    tool: name,
    question,
    detail,
    language: definition?.language || 'json',
    action: definition?.action || 'Allow it'
  }
}
