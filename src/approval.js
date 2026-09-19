const APPROVAL_TOOLS = {
  run_command: { verb: 'Run', noun: 'command', preposition: 'in', action: 'Run it', value: args => args.command },
  read_file: { verb: 'Read', noun: 'file', preposition: 'from', action: 'Read it', value: args => args.path },
  write_file: { verb: 'Write', noun: 'file', preposition: 'in', action: 'Write it', value: args => args.path },
  edit_file: { verb: 'Edit', noun: 'file', preposition: 'in', action: 'Edit it', value: args => args.path },
  list_dir: { verb: 'List', noun: 'folder', preposition: 'in', action: 'List it', value: args => args.path || '.' },
  job: { verb: 'Manage', noun: 'background job', preposition: 'on', action: 'Allow it', value: args => [args.action, args.id].filter(Boolean).join(' ') }
}

function compactPath (cwd) {
  return cwd ? String(cwd).replace(/^\/Users\/[^/]+/, '~') : ''
}

function fallbackValue (name, args) {
  if (args?.command) return String(args.command)
  if (args?.path) return String(args.path)
  if (args?.url) return String(args.url)
  if (args?.query) return String(args.query)
  if (args?.name) return String(args.name)
  if (args?.id) return String(args.id)
  return `${name.replace(/_/g, ' ')} (no details provided)`
}

export function approvalPresentation (approval, cwd) {
  const name = String(approval?.name || approval?.tool || 'tool')
  const args = approval?.args && typeof approval.args === 'object' ? approval.args : {}
  const definition = APPROVAL_TOOLS[name]
  const detail = String(definition?.value(args) || fallbackValue(name, args))
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
    action: definition?.action || 'Allow it'
  }
}
