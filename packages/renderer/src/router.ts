import Game from "./components/Game.vue";
import Home from "./components/Home.vue";
import {createRouter, createWebHashHistory} from "vue-router";

const routes = [
    {path: '/', component: Home},
    {path: '/game', component: Game},
]

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
})
