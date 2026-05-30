import { initPixiCanvas, renderCanvases, resizePixiCanvas } from '@/renderPixiCanvas'
import { exportSkiaCanvasToPdf, resizeSkiaCanvas } from '@/renderSkiaCanvas'
import { getPixiContent } from '@/pixiContent'
;(async () => {
    initPixiCanvas()
    const content = await getPixiContent()
    renderCanvases(content)

    document.getElementById('export-pdf-btn')?.addEventListener('click', () => {
        void exportSkiaCanvasToPdf()
    })

    // window.addEventListener('resize', () => {
    //     resizeSkiaCanvas()
    //     resizePixiCanvas()
    // })
})()