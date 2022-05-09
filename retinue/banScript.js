//document.getElementsByClassName('begin_btn')[0].style.visibility='hidden'
const banClass = ['begin_btn', 'game_kaishi', 'play', 'pag-play']
let banElements = []
for (let c of banClass) {
    banElements = banElements.concat(...document.getElementsByClassName(c))
}
for (let e of banElements) {
    console.log(e)
    if (e.style) e.style.visibility = 'hidden'
}
