interface GameInfo {
    title: string,
    category: string,
    type: "flash" | "unity" | "h5",
    online: {
        originPage: string,
        truePage: string,
        binUrl: string
    },
    local?: {}
}

export {
    GameInfo
}
