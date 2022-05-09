import Home from "./components/Home.vue";
import Game from "./components/Game.vue";
import Setting from "./components/Setting.vue";
import {createRouter, createWebHashHistory} from "vue-router";

const routes = [
    {path: '/', component: Home},
    {path: '/game', component: Game},
    {path: '/setting', component: Setting},
]

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
})
