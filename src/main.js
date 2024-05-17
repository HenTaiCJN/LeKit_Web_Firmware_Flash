import {createApp} from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import 'vue-web-terminal/lib/theme/dark.css'
import App from './App.vue'

const app = createApp(App)

app.use(ElementPlus)
app.mount('#app')