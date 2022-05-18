// 禁用页面元素
const banClass = ['begin_btn', 'game_kaishi', 'play', 'pag-play']
let banElements = []
for (let c of banClass) {
    banElements = banElements.concat(...document.getElementsByClassName(c))
}
for (let e of banElements) {
    console.log(e)
    if (e.style) e.style.visibility = 'hidden'
}
// 阻止点击
document.addEventListener('click', e => {
    e.preventDefault()
})
