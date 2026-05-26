import { initPixiCanvas, renderCanvases, resizePixiCanvas } from '@/renderPixiCanvas'
import { resizeSkiaCanvas } from '@/renderSkiaCanvas'
import { getPixiContent } from '@/pixiContent'

initPixiCanvas()
const content = await getPixiContent()
renderCanvases(content)

window.addEventListener('resize', () => {
    resizeSkiaCanvas()
    resizePixiCanvas()
})