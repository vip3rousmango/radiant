/**
 * Approval cards must describe the tool that is waiting for permission.
 *
 * A read_file approval has `args.path`, not `args.command`. The old card only
 * rendered the latter, so every file-read approval showed an empty code row.
 */
import { approvalPresentation } from '../src/approval.js'

let pass = 0
let fail = 0
const failures = []
const ok = (name, condition, detail = '') => {
  if (condition) pass++
  else failures.push(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`); if (!condition) fail++
}
const read = approvalPresentation({ name: 'read_file', args: { path: '/Users/tony/project/src/App.jsx', offset: 3, limit: 8 } }, '/Users/tony/project')
ok('read_file approval shows every argument', read.detail === '{\n  "path": "/Users/tony/project/src/App.jsx",\n  "offset": 3,\n  "limit": 8\n}')
ok('read_file approval uses a read action', read.action === 'Read it')
ok('read_file approval names the read operation', read.question === 'Read this file from ~/project?')

const shell = approvalPresentation({ name: 'run_command', args: { command: 'npm run build', cwd: '/tmp' } }, '/Users/tony/project')
ok('run_command approval keeps the shell command', shell.detail === 'npm run build')
ok('run_command approval keeps the run action', shell.action === 'Run it')

const unknown = approvalPresentation({ name: 'mcp_lookup', args: { query: 'find <script>', token: 'secret' } })
ok('unknown approvals show complete structured arguments', unknown.detail === '{\n  "query": "find <script>",\n  "token": "secret"\n}')
ok('unknown approvals use JSON presentation', unknown.language === 'json')

console.log(failures.join('\n'))
console.log(`\n${pass}/${pass + fail} passed  ·  approval cards keep tool details visible`)
process.exit(fail ? 1 : 0)
