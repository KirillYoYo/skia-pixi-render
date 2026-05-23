import { renderPixiCanvas, resizePixiCanvas } from '@/renderPixiCanvas'
import { renderSkiaCanvas, resizeSkiaCanvas } from '@/renderSkiaCanvas'

renderPixiCanvas()
await renderSkiaCanvas()

window.addEventListener('resize', () => {
    resizeSkiaCanvas()
    resizePixiCanvas()
})