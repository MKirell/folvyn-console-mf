import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n } from '@/i18n'
import { autosize } from './directives/autosize'
import { pageThumb } from './directives/page-thumb'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.use(i18n)
app.directive('autosize', autosize)
app.directive('page-thumb', pageThumb)
app.mount('#app')

requestAnimationFrame(() => {
  requestAnimationFrame(() => document.documentElement.classList.remove('booting'))
})
