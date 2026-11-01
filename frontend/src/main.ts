import '@design/tokens.css'
import './styles/base.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'

createApp(App).use(createPinia()).mount('#app')
