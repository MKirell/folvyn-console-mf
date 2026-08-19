export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }

  const left = a as Record<string, unknown>
  const right = b as Record<string, unknown>
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if (!deepEqual(left[key], right[key])) return false
  }
  return true
}

export function clone<T>(value: T): T {
  if (value === undefined) return undefined as T
  return JSON.parse(JSON.stringify(value)) as T
}

export function writableKeys(
  original: Record<string, unknown> | null,
  draft: Record<string, unknown>,
): string[] {
  return [...new Set([...Object.keys(draft), ...Object.keys(original ?? {})])]
}

export function changedFields<T extends Record<string, unknown>>(
  original: T | null,
  draft: T,
  allowed: readonly string[],
): Partial<T> {
  const payload: Record<string, unknown> = {}

  for (const key of allowed) {
    const next = key in draft ? draft[key] : null
    if (next === undefined) continue
    if (original ? deepEqual(original[key], next) : next === null) continue
    payload[key] = next
  }

  return payload as Partial<T>
}
