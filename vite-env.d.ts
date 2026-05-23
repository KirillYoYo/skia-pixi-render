/// <reference types="vite/client" />
declare module '*.png' {
    const src: string
    export default src
}
declare module '*.json' {
    const src: any
    export default src
}
