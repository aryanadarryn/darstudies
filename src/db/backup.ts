// Export / import all on-device data as one JSON file (plan §5, §6.5).
import { db, TABLES } from './db'

const FORMAT = 'sainsku-f4-backup'

export async function exportBackup(): Promise<Blob> {
  const data: Record<string, unknown[]> = {}
  for (const t of TABLES) data[t] = await db.table(t).toArray()
  const payload = { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), data }
  return new Blob([JSON.stringify(payload)], { type: 'application/json' })
}

export async function importBackup(file: File) {
  const payload = JSON.parse(await file.text())
  if (payload?.format !== FORMAT || typeof payload.data !== 'object') throw new Error('Not a Darstudies backup file')
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) {
      await db.table(t).clear()
      const rows = payload.data[t]
      if (Array.isArray(rows)) await db.table(t).bulkPut(rows)
    }
  })
}

export async function resetAll() {
  await db.transaction('rw', TABLES.map((t) => db.table(t)), async () => {
    for (const t of TABLES) await db.table(t).clear()
  })
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
