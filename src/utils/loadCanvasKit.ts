import type { CanvasKit } from 'canvaskit-wasm'

import canvaskitJsUrl from '../../libs/canvaskit.js?url'
import canvaskitWasmUrl from '../../libs/canvaskit.wasm?url'

type CanvasKitInitFn = (options?: { locateFile?: (file: string) => string }) => Promise<CanvasKit>

type WindowWithCanvasKit = Window & { CanvasKitInit?: CanvasKitInitFn }

let loadPromise: Promise<CanvasKitInitFn> | null = null

// загрузка кастомной сборки Skia
export function loadCanvasKitInit(): Promise<CanvasKitInitFn> {
    if (loadPromise) {
        return loadPromise
    }

    loadPromise = new Promise((resolve, reject) => {
        const w = window as WindowWithCanvasKit
        if (typeof w.CanvasKitInit === 'function') {
            resolve(w.CanvasKitInit)
            return
        }

        const script = document.createElement('script')
        script.src = canvaskitJsUrl
        script.async = true
        script.onload = () => {
            if (typeof w.CanvasKitInit === 'function') {
                resolve(w.CanvasKitInit)
                return
            }
            reject(new Error('CanvasKitInit not on window after loading libs/canvaskit.js'))
        }
        script.onerror = () => reject(new Error(`Failed to load ${canvaskitJsUrl}`))
        document.head.appendChild(script)
    })

    return loadPromise
}

export function getCanvasKitWasmUrl(): string {
    return canvaskitWasmUrl
}