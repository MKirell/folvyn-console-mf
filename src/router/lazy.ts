import { defineAsyncComponent, type Component } from 'vue'
import SkeletonPage from '@/components/ui/SkeletonPage.vue'

const SKELETON_DELAY_MS = 150

export function lazyView(loader: () => Promise<{ default: Component }>): Component {
  return defineAsyncComponent({
    loader,
    loadingComponent: SkeletonPage,
    delay: SKELETON_DELAY_MS,
  })
}
