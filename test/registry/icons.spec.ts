import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { ICONS, PORTFOLIO_ICONS, iconComponent, rendersInPortfolio } from '@/registry/icons'

const PORTFOLIO_ICONS_FILE = resolve(__dirname, '../../../folvyn-portfolio-mf/src/utils/icons.ts')

function mappedInPortfolio(): string[] {
  const source = readFileSync(PORTFOLIO_ICONS_FILE, 'utf8')
  const start = source.indexOf('export const icons: Record<string, Component> = {')
  const end = source.indexOf('\n}', start)

  return source
    .slice(source.indexOf('{', start) + 1, end)
    .split('\n')
    .map((line) => /^\s{2}([A-Za-z0-9]+),$/.exec(line)?.[1])
    .filter((name): name is string => Boolean(name))
}

describe('the icon catalogue', () => {
  it('offers every icon it can draw, sorted', () => {
    expect(PORTFOLIO_ICONS).toEqual([...Object.keys(ICONS)].sort())
  })

  it('resolves a name to its component, and an unknown name to nothing', () => {
    expect(iconComponent('Award')).toBe(ICONS.Award)
    expect(iconComponent('NotAnIcon')).toBeUndefined()
    expect(iconComponent('')).toBeUndefined()
  })

  it('reports whether the portfolio draws a name', () => {
    expect(rendersInPortfolio('Award')).toBe(true)
    expect(rendersInPortfolio('NotAnIcon')).toBe(false)
  })
})

describe.skipIf(!existsSync(PORTFOLIO_ICONS_FILE))('catalogue mirrors the portfolio', () => {
  it('offers exactly the icons the portfolio maps, so a pick always renders', () => {
    expect([...PORTFOLIO_ICONS]).toEqual(mappedInPortfolio().sort())
  })
})
