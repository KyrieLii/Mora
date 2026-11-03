// Packs the built skill and web app into release archives under release/.
// Run after `pnpm build` and `pnpm build:skill`: `pnpm package:release`.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = new URL('..', import.meta.url).pathname
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const out = join(root, 'release')
const stage = join(out, '.stage')

function need(path, hint) {
  if (!existsSync(join(root, path))) {
    console.error(`Missing ${path}. ${hint}`)
    process.exit(1)
  }
}
need('skills/family-finance-review/scripts/ffr.mjs', 'Run pnpm build:skill first.')
need('dist/index.html', 'Run pnpm build first.')

rmSync(out, { recursive: true, force: true })
mkdirSync(stage, { recursive: true })

/** Zips a staged folder so the archive unpacks into that one folder. */
function pack(folder, archive) {
  // -X leaves out extra file attributes; -r recurses; run from the stage so paths start at the folder.
  execFileSync('zip', ['-qrX', join(out, archive), folder], { cwd: stage })
  return archive
}

// The skill: unzip into an agent's skills directory as-is.
const skill = join(stage, 'family-finance-review')
cpSync(join(root, 'skills/family-finance-review'), skill, { recursive: true })
cpSync(join(root, 'LICENSE'), join(skill, 'LICENSE'))

// The web app: a static site that must be served from the root of a domain (it fetches /fx.json).
const web = join(stage, `family-finance-review-web`)
cpSync(join(root, 'dist'), web, { recursive: true })
cpSync(join(root, 'LICENSE'), join(web, 'LICENSE'))

const archives = [pack('family-finance-review', `family-finance-review-skill-v${version}.zip`), pack('family-finance-review-web', `family-finance-review-web-v${version}.zip`)]
rmSync(stage, { recursive: true, force: true })

const sums = archives.map((name) => `${createHash('sha256').update(readFileSync(join(out, name))).digest('hex')}  ${name}`)
writeFileSync(join(out, 'SHA256SUMS.txt'), `${sums.join('\n')}\n`)

console.log(readdirSync(out).map((name) => `release/${name}`).join('\n'))
