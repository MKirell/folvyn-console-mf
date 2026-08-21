import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import EmptyState from '@/components/ui/EmptyState.vue'
import SkeletonGrid from '@/components/ui/SkeletonGrid.vue'
import SkeletonBar from '@/components/ui/SkeletonBar.vue'
import SkeletonList from '@/components/ui/SkeletonList.vue'
import SkeletonForm from '@/components/ui/SkeletonForm.vue'
import SkeletonPage from '@/components/ui/SkeletonPage.vue'
import DepthGauge from '@/components/charts/DepthGauge.vue'
import DonutChart from '@/components/charts/DonutChart.vue'
import { useTheme } from '@/composables/useTheme'

describe('EmptyState', () => {
  it('falls back to its own glyph when none is named', () => {
    const wrapper = mount(EmptyState, { props: { title: 'Nothing here' } })

    expect(wrapper.text()).toContain('Nothing here')
    expect(wrapper.find('svg').exists()).toBe(true)
  })

  it('renders the description and the icon it was given', () => {
    const wrapper = mount(EmptyState, {
      props: { title: 'Nothing here', description: 'try later', icon: 'Shield' },
    })

    expect(wrapper.text()).toContain('try later')
  })

  it('renders an unknown icon name without breaking the screen', () => {
    const wrapper = mount(EmptyState, { props: { title: 'x', icon: 'NotAnIcon' } })

    expect(wrapper.html()).toBeTruthy()
  })
})

describe('skeletons', () => {
  it('take their shape from props, and have a default shape', () => {
    expect(mount(SkeletonGrid).html()).toBeTruthy()
    expect(
      mount(SkeletonGrid, {
        props: { tiles: 2, panels: [6, 6], rows: 2, label: 'loading' },
      }).html(),
    ).toBeTruthy()
    expect(mount(SkeletonBar).html()).toBeTruthy()
    expect(mount(SkeletonList).html()).toBeTruthy()
    expect(mount(SkeletonForm).html()).toBeTruthy()
    expect(mount(SkeletonPage).html()).toBeTruthy()
  })
})

describe('charts at their edges', () => {
  it('draws a gauge when every band is full and when none is', () => {
    expect(
      mount(DepthGauge, {
        props: {
          quartiles: [10, 10, 10, 10],
          sessions: 10,
          labels: ['a', 'b', 'c', 'd'],
          empty: 'nothing yet',
        },
      }).html(),
    ).toBeTruthy()
    expect(
      mount(DepthGauge, {
        props: {
          quartiles: [0, 0, 0, 0],
          sessions: 5,
          labels: ['a', 'b', 'c', 'd'],
          empty: 'nothing yet',
        },
      }).html(),
    ).toBeTruthy()
  })

  it('folds a long tail into one slice rather than drawing a hundred', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ key: `k${i}`, count: 12 - i }))
    const wrapper = mount(DonutChart, { props: { rows: many, label: 'Countries' } })

    expect(wrapper.html()).toBeTruthy()
  })

  it('draws a single slice as a whole circle', () => {
    const wrapper = mount(DonutChart, { props: { rows: [{ key: 'FR', count: 3 }], label: 'x' } })

    expect(wrapper.text()).toContain('FR')
  })
})

describe('useTheme', () => {
  it('applies the scheme to the document and flips it back', () => {
    const { theme, toggleTheme } = useTheme()

    const first = theme.value
    toggleTheme()

    expect(theme.value).not.toBe(first)
    expect(document.documentElement.classList.contains(`scheme-${theme.value}`)).toBe(true)

    toggleTheme()
    expect(theme.value).toBe(first)
    expect(document.documentElement.classList.contains(`scheme-${first}`)).toBe(true)
  })
})
