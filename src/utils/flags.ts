import { ref, type Ref } from 'vue'

const CODE = /^[a-z]{2}$/

const FILES = import.meta.glob('/node_modules/country-flag-icons/3x2/*.svg', {
  query: '?url',
  import: 'default',
}) as Record<string, () => Promise<string>>

const BY_CODE = new Map(
  Object.entries(FILES)
    .map(([path, load]): [string, () => Promise<string>] => [
      (path.split('/').pop() ?? '').replace('.svg', '').toLowerCase(),
      load,
    ])
    .filter(([code]) => CODE.test(code)),
)

const resolved = new Map<string, Ref<string | undefined>>()

export const FLAG_CODES = [...BY_CODE.keys()].sort()

export function flagUrl(code: string | null | undefined): Ref<string | undefined> {
  const key = code?.toLowerCase() ?? ''
  const cached = resolved.get(key)
  if (cached) return cached

  const url = ref<string | undefined>(undefined)
  resolved.set(key, url)

  const load = CODE.test(key) ? BY_CODE.get(key) : undefined
  if (load) void load().then((value) => (url.value = value))

  return url
}
