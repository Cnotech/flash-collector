import {createApp} from 'vue'
import App from './App.vue'
import './samples/node-api'
import Antd, {ConfigProvider} from 'ant-design-vue';
import 'ant-design-vue/dist/antd.variable.min.css';
import {router} from "./router";

ConfigProvider.config({
    theme: {
        primaryColor: '#4bb117',
    },
});

createApp(App)
    .use(Antd)
    .use(router)
    .mount('#app')
    .$nextTick(window.removeLoading)
