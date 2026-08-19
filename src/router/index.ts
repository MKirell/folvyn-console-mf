import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { lazyView } from '@/router/lazy'
import { useAuthStore } from '@/stores/auth'
import { useContentStore } from '@/stores/content'
import { useUiStore } from '@/stores/ui'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true, chrome: false },
  },
  {
    path: '/auth/callback',
    name: 'callback',
    component: () => import('@/views/CallbackView.vue'),
    meta: { public: true, chrome: false },
  },
  {
    path: '/legal/:slug(privacy|terms)',
    name: 'legal',
    component: () => import('@/views/LegalView.vue'),
    meta: { public: true, chrome: false },
  },
  { path: '/legal', redirect: '/legal/privacy' },
  { path: '/', redirect: '/insights' },
  {
    path: '/welcome',
    name: 'welcome',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { chrome: false, onboarding: true },
  },
  {
    path: '/platform',
    name: 'platform',
    component: lazyView(() => import('@/views/PlatformView.vue')),
    meta: { title: 'Overview', titleKey: 'overview', platform: true },
  },
  {
    path: '/platform/portfolios',
    name: 'platform-portfolios',
    component: lazyView(() => import('@/views/PlatformPortfoliosView.vue')),
    meta: { title: 'Portfolios', titleKey: 'portfolios', platform: true },
  },
  {
    path: '/platform/portfolios/:id',
    name: 'platform-account',
    component: lazyView(() => import('@/views/PlatformAccountView.vue')),
    meta: { title: 'Account', titleKey: 'account', platform: true },
  },
  {
    path: '/platform/traffic',
    name: 'platform-traffic',
    component: lazyView(() => import('@/views/PlatformTrafficView.vue')),
    meta: { title: 'Traffic', titleKey: 'traffic', platform: true },
  },
  {
    path: '/platform/erasures',
    name: 'platform-erasures',
    component: lazyView(() => import('@/views/PlatformErasureView.vue')),
    meta: { title: 'Erasure queue', titleKey: 'erasureQueue', platform: true },
  },
  {
    path: '/platform/config',
    name: 'platform-config',
    component: lazyView(() => import('@/views/PlatformConfigView.vue')),
    meta: { title: 'Platform config', titleKey: 'platformConfig', platform: true },
  },
  {
    path: '/platform/audit',
    name: 'platform-audit',
    component: lazyView(() => import('@/views/PlatformAuditView.vue')),
    meta: { title: 'Audit', titleKey: 'audit', platform: true },
  },
  {
    path: '/platform/health',
    name: 'platform-health',
    component: lazyView(() => import('@/views/PlatformHealthView.vue')),
    meta: { title: 'Health', titleKey: 'health', platform: true },
  },
  {
    path: '/insights',
    name: 'insights',
    component: lazyView(() => import('@/views/DashboardView.vue')),
    meta: { title: 'Insights', titleKey: 'insights' },
  },
  { path: '/c/locale', redirect: '/locales' },
  {
    path: '/c/:collection',
    name: 'collection',
    component: lazyView(() => import('@/views/CollectionView.vue')),
  },
  {
    path: '/c/:collection/:id',
    name: 'entity',
    component: lazyView(() => import('@/views/EntityEditorView.vue')),
  },
  {
    path: '/person',
    name: 'person',
    component: lazyView(() => import('@/views/SingletonView.vue')),
    meta: {
      title: 'Person',
      collection: 'person',
      blurb: 'Who you are: the identity, the about paragraphs and the contact blurb.',
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: lazyView(() => import('@/views/SingletonView.vue')),
    meta: {
      title: 'Hero',
      collection: 'profile',
      blurb: 'The opening screen: the subtitles that type themselves, the tagline and the chips.',
    },
  },
  {
    path: '/portfolio',
    name: 'portfolio',
    component: lazyView(() => import('@/views/PortfolioView.vue')),
    meta: { title: 'Portfolio', titleKey: 'portfolio' },
  },
  {
    path: '/locales',
    name: 'locales',
    component: lazyView(() => import('@/views/LocalesView.vue')),
    meta: { title: 'Locales', titleKey: 'locales' },
  },
  {
    path: '/locales/queue/:code',
    name: 'locale-queue',
    component: lazyView(() => import('@/views/LocaleQueueView.vue')),
    meta: { title: 'Locale work queue', titleKey: 'localeQueue' },
  },
  {
    path: '/media',
    name: 'media',
    component: lazyView(() => import('@/views/MediaView.vue')),
    meta: { title: 'Media', titleKey: 'media' },
  },
  {
    path: '/history',
    name: 'history',
    component: lazyView(() => import('@/views/HistoryView.vue')),
    meta: { title: 'History', titleKey: 'history' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: lazyView(() => import('@/views/NotFoundView.vue')),
    meta: { title: 'Not found', titleKey: 'notFound' },
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (auth.restoring) await auth.restore()
  if (to.meta.public) return true

  if (!auth.isAuthenticated) {
    return { name: 'login', query: { returnTo: to.fullPath } }
  }

  if (auth.isPlatform) {
    if (to.meta.platform !== true) return { name: 'platform' }
  } else {
    if (to.meta.platform === true) return { name: 'insights' }

    const content = useContentStore()
    void content.loadAll()

    if (content.loaded) {
      const fresh = content.locales.length === 0
      if (fresh && to.meta.onboarding !== true) return { name: 'welcome' }
      if (!fresh && to.meta.onboarding === true) return { name: 'insights' }
    }
  }

  const ui = useUiStore()
  if (!(await ui.confirmLeave())) return false
  ui.dirty = false

  return true
})
