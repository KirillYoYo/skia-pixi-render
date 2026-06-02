import { initPixiCanvas, renderCanvases } from '@/renderPixiCanvas'
import { exportSkiaCanvasToPdf } from '@/renderSkiaCanvas'
import { getPixiContent, getRandomizedPixiContent } from '@/utils/pixiContent'
;(async () => {
    initPixiCanvas()
    const content = await getPixiContent()
    renderCanvases(content)

    document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
        void exportSkiaCanvasToPdf()
    })

    document.getElementById('render-random')?.addEventListener('click', () => {
        renderRandomObjects()
    })

    async function renderRandomObjects() {
        const content = await getRandomizedPixiContent()
        renderCanvases(content)
    }
})()