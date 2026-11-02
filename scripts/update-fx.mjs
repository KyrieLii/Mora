import { writeFile } from 'node:fs/promises'

const res = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=CNY')
if (!res.ok) throw new Error(`Exchange rate request failed: ${res.status}`)
const data = await res.json()
const fx = { usdCny: data.rates.CNY, date: data.date, source: 'Frankfurter' }
await writeFile(new URL('../public/fx.json', import.meta.url), `${JSON.stringify(fx)}\n`)
