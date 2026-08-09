import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
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
    component: () => import('@/views/PlatformView.vue'),
    meta: { title: 'Overview', platform: true },
  },
  {
    path: '/platform/portfolios',
    name: 'platform-portfolios',
    component: () => import('@/views/PlatformPortfoliosView.vue'),
    meta: { title: 'Portfolios', platform: true },
  },
  {
    path: '/platform/portfolios/:id',
    name: 'platform-account',
    component: () => import('@/views/PlatformAccountView.vue'),
    meta: { title: 'Account', platform: true },
  },
  {
    path: '/platform/traffic',
    name: 'platform-traffic',
    component: () => import('@/views/PlatformTrafficView.vue'),
    meta: { title: 'Traffic', platform: true },
  },
  {
    path: '/platform/erasures',
    name: 'platform-erasures',
    component: () => import('@/views/PlatformErasureView.vue'),
    meta: { title: 'Erasure queue', platform: true },
  },
  {
    path: '/platform/config',
    name: 'platform-config',
    component: () => import('@/views/PlatformConfigView.vue'),
    meta: { title: 'Platform config', platform: true },
  },
  {
    path: '/platform/audit',
    name: 'platform-audit',
    component: () => import('@/views/PlatformAuditView.vue'),
    meta: { title: 'Audit', platform: true },
  },
  {
    path: '/platform/health',
    name: 'platform-health',
    component: () => import('@/views/PlatformHealthView.vue'),
    meta: { title: 'Health', platform: true },
  },
  {
    path: '/insights',
    name: 'insights',
    component: () => import('@/views/DashboardView.vue'),
    meta: { title: 'Insights' },
  },
  { path: '/c/locale', redirect: '/locales' },
  {
    path: '/c/:collection',
    name: 'collection',
    component: () => import('@/views/CollectionView.vue'),
  },
  {
    path: '/c/:collection/:id',
    name: 'entity',
    component: () => import('@/views/EntityEditorView.vue'),
  },
  {
    path: '/person',
    name: 'person',
    component: () => import('@/views/SingletonView.vue'),
    meta: {
      title: 'Person',
      collection: 'person',
      blurb: 'Who you are: the identity, the about paragraphs and the contact blurb.',
    },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/views/SingletonView.vue'),
    meta: {
      title: 'Hero',
      collection: 'profile',
      blurb: 'The opening screen: the subtitles that type themselves, the tagline and the chips.',
    },
  },
  {
    path: '/portfolio',
    name: 'portfolio',
    component: () => import('@/views/PortfolioView.vue'),
    meta: { title: 'Portfolio' },
  },
  {
    path: '/locales',
    name: 'locales',
    component: () => import('@/views/LocalesView.vue'),
    meta: { title: 'Locales' },
  },
  {
    path: '/locales/queue/:code',
    name: 'locale-queue',
    component: () => import('@/views/LocaleQueueView.vue'),
    meta: { title: 'Locale work queue' },
  },
  {
    path: '/media',
    name: 'media',
    component: () => import('@/views/MediaView.vue'),
    meta: { title: 'Media' },
  },
  {
    path: '/history',
    name: 'history',
    component: () => import('@/views/HistoryView.vue'),
    meta: { title: 'History' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundView.vue'),
    meta: { title: 'Not found' },
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
    await content.loadAll()

    if (content.loaded) {
      const fresh = content.locales.length === 0
      if (fresh && to.meta.onboarding !== true) return { name: 'welcome' }
      if (!fresh && to.meta.onboarding === true) return { name: 'insights' }
    }
  }

  const ui = useUiStore()
  if (ui.dirty && !window.confirm('Leave this screen? Unsaved changes will be lost.')) {
    return false
  }
  ui.dirty = false

  return true
})
