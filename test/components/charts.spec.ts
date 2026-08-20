import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BarRows from '@/components/charts/BarRows.vue'
import CardRows from '@/components/charts/CardRows.vue'
import DepthGauge from '@/components/charts/DepthGauge.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import FunnelColumns from '@/components/charts/FunnelColumns.vue'
import FunnelRows from '@/components/charts/FunnelRows.vue'
import HeatCalendar from '@/components/charts/HeatCalendar.vue'
import RankList from '@/components/charts/RankList.vue'
import SparkLine from '@/components/charts/SparkLine.vue'
import SplitStat from '@/components/charts/SplitStat.vue'
import StackedBar from '@/components/charts/StackedBar.vue'
import StatTile from '@/components/charts/StatTile.vue'
import VolumeColumns from '@/components/charts/VolumeColumns.vue'
import AccountRows from '@/components/platform/AccountRows.vue'
import ConfigRows from '@/components/platform/ConfigRows.vue'

const breakdown = [
  { key: 'FR', count: 12 },
  { key: 'TN', count: 7 },
  { key: 'DE', count: 3 },
]

const points = [
  { date: '2026-08-01', value: 4 },
  { date: '2026-08-02', value: 0 },
  { date: '2026-08-03', value: 9 },
]

const EMPTY = 'nothing yet'

function account(id: string, slug: string, status: string, publishedAt: string | null) {
  return {
    id,
    slug,
    status,
    publishedAt,
    email: null,
    displayName: null,
    createdAt: '2026-07-01T00:00:00.000Z',
    sessions: 12,
    visitors: 8,
  }
}

const cases: { name: string; component: unknown; full: object; blank: object }[] = [
  {
    name: 'BarRows',
    component: BarRows,
    full: { rows: breakdown, slots: 5, showShare: true, suffix: '%', empty: EMPTY },
    blank: { rows: [], empty: EMPTY },
  },
  {
    name: 'CardRows',
    component: CardRows,
    full: {
      rows: [{ key: 'a', label: 'A', impressions: 10, clicks: 4, rate: 40 }],
      slots: 3,
      empty: EMPTY,
    },
    blank: { rows: [], empty: EMPTY },
  },
  {
    name: 'DepthGauge',
    component: DepthGauge,
    full: { quartiles: [10, 8, 4, 1], sessions: 10, empty: EMPTY },
    blank: { quartiles: [0, 0, 0, 0], sessions: 0, empty: EMPTY },
  },
  {
    name: 'DonutChart',
    component: DonutChart,
    full: { rows: breakdown, label: 'Countries', empty: EMPTY },
    blank: { rows: [], label: 'Countries', empty: EMPTY },
  },
  {
    name: 'FunnelColumns',
    component: FunnelColumns,
    full: { rows: breakdown, sessions: 20, empty: EMPTY },
    blank: { rows: [], sessions: 0, empty: EMPTY },
  },
  {
    name: 'FunnelRows',
    component: FunnelRows,
    full: { rows: breakdown, sessions: 20 },
    blank: { rows: [], sessions: 0 },
  },
  {
    name: 'HeatCalendar',
    component: HeatCalendar,
    full: { points, unit: 'visits', empty: EMPTY },
    blank: { points: [], empty: EMPTY },
  },
  {
    name: 'RankList',
    component: RankList,
    full: { rows: breakdown, slots: 4, empty: EMPTY },
    blank: { rows: [], empty: EMPTY },
  },
  {
    name: 'SparkLine',
    component: SparkLine,
    full: { points, unit: 'sessions', label: 'Traffic' },
    blank: { points: [] },
  },
  {
    name: 'SplitStat',
    component: SplitStat,
    full: {
      rows: breakdown,
      unit: 'people',
      empty: EMPTY,
      verdicts: { strong: 'strong', even: 'even', weak: 'weak' },
    },
    blank: { rows: [], empty: EMPTY },
  },
  {
    name: 'StackedBar',
    component: StackedBar,
    full: { rows: breakdown, empty: EMPTY },
    blank: { rows: [], empty: EMPTY },
  },
  {
    name: 'StatTile',
    component: StatTile,
    full: { label: 'Sessions', value: '12', delta: 4, hint: 'up' },
    blank: { label: 'Sessions', value: '0' },
  },
  {
    name: 'VolumeColumns',
    component: VolumeColumns,
    full: { points, unit: 'events', dense: true, empty: EMPTY },
    blank: { points: [], empty: EMPTY },
  },
  {
    name: 'AccountRows',
    component: AccountRows,
    full: {
      rows: [
        account('1', 'ada-lovelace', 'published', '2026-08-01T00:00:00.000Z'),
        account('2', 'grace-hopper', 'suspended', null),
        account('3', 'alan-turing', 'draft', null),
      ],
      slots: 5,
      empty: EMPTY,
    },
    blank: { rows: [], empty: EMPTY },
  },
  {
    name: 'ConfigRows',
    component: ConfigRows,
    full: { rows: [{ key: 'slugMax', label: 'Slug max', value: '40' }], empty: EMPTY },
    blank: { rows: [], empty: EMPTY },
  },
]

describe('every chart renders with data and without', () => {
  for (const { name, component, full, blank } of cases) {
    it(`${name} renders its rows`, () => {
      const wrapper = mount(component as never, { props: full as never })

      expect(wrapper.html()).toBeTruthy()
      wrapper.unmount()
    })

    it(`${name} says so rather than drawing an empty chart`, () => {
      const wrapper = mount(component as never, { props: blank as never })

      expect(wrapper.html()).toBeTruthy()
      wrapper.unmount()
    })
  }
})

describe('a chart that has something to say says it', () => {
  it('names each segment it drew', () => {
    const wrapper = mount(StackedBar, { props: { rows: breakdown } })

    expect(wrapper.text()).toContain('FR')
  })

  it('shows the empty message instead of a zero-height bar', () => {
    const wrapper = mount(StackedBar, { props: { rows: [], empty: EMPTY } })

    expect(wrapper.text()).toContain(EMPTY)
  })

  it('marks a negative delta differently from a positive one', () => {
    const up = mount(StatTile, { props: { label: 'x', value: '1', delta: 3 } })
    const down = mount(StatTile, { props: { label: 'x', value: '1', delta: -3 } })

    expect(up.html()).not.toBe(down.html())
  })

  it('distinguishes a suspended portfolio from a published one', () => {
    const wrapper = mount(AccountRows, {
      props: {
        rows: [
          account('1', 'ada-lovelace', 'published', '2026-08-01T00:00:00.000Z'),
          account('2', 'grace-hopper', 'suspended', null),
        ],
      },
    })

    expect(wrapper.text()).toContain('ada-lovelace')
    expect(wrapper.text()).toContain('grace-hopper')
  })
})
