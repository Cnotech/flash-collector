function getTimeStamp(): string {
    let d = new Date()
    const _ = (n: number): string => {
        let s = n.toString()
        return s.length < 2 ? "0" + s : s
    }
    return _(d.getFullYear()) + _(d.getMonth() + 1) + _(d.getDate()) + "-" + _(d.getHours()) + _(d.getMinutes()) + _(d.getSeconds())
}

export {
    getTimeStamp
}
