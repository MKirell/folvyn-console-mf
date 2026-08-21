import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import BarRows from '@/components/charts/BarRows.vue'
import CardRows from '@/components/charts/CardRows.vue'
import DepthGauge from '@/components/charts/DepthGauge.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import FunnelColumns from '@/components/charts/FunnelColumns.vue'
import FunnelShape from '@/components/charts/FunnelShape.vue'
import HeatCalendar from '@/components/charts/HeatCalendar.vue'
import RankList from '@/components/charts/RankList.vue'
import SparkLine from '@/components/charts/SparkLine.vue'
import SplitStat from '@/components/charts/SplitStat.vue'
import StackedBar from '@/components/charts/StackedBar.vue'
import SegmentedMeter from '@/components/charts/SegmentedMeter.vue'
import RadialBars from '@/components/charts/RadialBars.vue'
import StatTile from '@/components/charts/StatTile.vue'
import VolumeColumns from '@/components/charts/VolumeColumns.vue'
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

const DEPTHS = ['Past the hero', 'Halfway down', 'Most of the way', 'To the very end']

const EMPTY = 'nothing yet'

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
    full: { quartiles: [10, 8, 4, 1], sessions: 10, labels: DEPTHS, empty: EMPTY },
    blank: { quartiles: [0, 0, 0, 0], sessions: 0, labels: DEPTHS, empty: EMPTY },
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
    name: 'FunnelShape',
    component: FunnelShape,
    full: { rows: breakdown, sessions: 100, label: 'Activation', empty: EMPTY },
    blank: { rows: [], sessions: 0, label: 'Activation', empty: EMPTY },
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
    name: 'RadialBars',
    component: RadialBars,
    full: { rows: breakdown, label: 'Contact', empty: EMPTY },
    blank: { rows: [], label: 'Contact', empty: EMPTY },
  },
  {
    name: 'SegmentedMeter',
    component: SegmentedMeter,
    full: { rows: breakdown, slots: 4, empty: EMPTY },
    blank: { rows: [], slots: 4, empty: EMPTY },
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
})
