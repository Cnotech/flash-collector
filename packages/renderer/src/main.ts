import {createApp} from 'vue'
import App from './App.vue'
import './samples/node-api'
import Antd from 'ant-design-vue';
import 'ant-design-vue/dist/antd.css';
import {router} from "./router";

createApp(App)
    .use(Antd)
    .use(router)
    .mount('#app')
    .$nextTick(window.removeLoading)
