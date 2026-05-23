import * as PIXI from 'pixi.js-legacy'
import { getPixiContent } from '@/renderMethods'

// 1) Создаём Application и указываем, чтобы canvas помещался в наш div
const app = new PIXI.Application({
    width: window.innerWidth / 2 - 20,
    height: window.innerHeight / 2 - 20,
    backgroundColor: 0x1099bb,
    forceCanvas: true,
})

export const renderCanvases = (pixiContainer: PIXI.Container) => {
    // Добавляем контейнер на сцену
    app.stage.removeChildren()
    app.stage.addChild(pixiContainer)
}

export function renderPixiCanvas() {
    const container = document.getElementById('pixi-canvas')

    if (container) {
        // Очищаем контейнер перед добавлением (чтобы не было дублирования)
        if (container.contains(app.view as unknown as Node)) {
            return
        }
        // Pixi сам создаст canvas; мы его вставляем в div
        container.appendChild(app.view as unknown as Node)
    }

    renderCanvases(getPixiContent())
}

// Функция для ресайза Pixi canvas
export const resizePixiCanvas = () => {
    const newWidth = window.innerWidth / 2 - 20
    const newHeight = window.innerHeight / 2 - 20

    // Изменяем размер рендерера
    app.renderer.resize(newWidth, newHeight)

    // Опционально: изменяем размер самого canvas элемента
    if (app.view) {
        const canvas = app.view as HTMLCanvasElement
        canvas.style.width = `${newWidth}px`
        canvas.style.height = `${newHeight}px`
    }

    // Перерисовываем контент с новым размером
    renderCanvases(getPixiContent())
}