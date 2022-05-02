import Game from "./components/Game.vue";
import HelloWorld from "./components/HelloWorld.vue";
import {createRouter, createWebHashHistory} from "vue-router";

const routes = [
    {path: '/', component: HelloWorld},
    {path: '/game', component: Game},
]

export const router = createRouter({
    history: createWebHashHistory(),
    routes,
})
