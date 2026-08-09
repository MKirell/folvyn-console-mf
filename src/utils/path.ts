type Bag = Record<string, unknown>

export function getPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((current, key) => {
    if (current === null || typeof current !== 'object') return undefined
    return (current as Bag)[key]
  }, source)
}

export function setPath<T extends Bag>(source: T, path: string, value: unknown): T {
  const [head, ...rest] = path.split('.')
  if (rest.length === 0) return { ...source, [head]: value }

  const child = source[head]
  const branch = child && typeof child === 'object' ? (child as Bag) : {}
  return { ...source, [head]: setPath(branch, rest.join('.'), value) }
}

export function flatten(source: unknown, prefix = ''): Record<string, unknown> {
  if (source === null || typeof source !== 'object' || Array.isArray(source)) {
    return prefix ? { [prefix]: source } : {}
  }

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(source as Bag)) {
    Object.assign(result, flatten(value, prefix ? `${prefix}.${key}` : key))
  }
  return result
}
