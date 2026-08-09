import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { autosize } from './directives/autosize'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.directive('autosize', autosize)
app.mount('#app')
