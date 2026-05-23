import * as PIXI from 'pixi.js-legacy'

export const getPixiContent = () => {
    const pixiContainer = new PIXI.Container()

    // Пример: простой Graphics‑элемент
    const graphics = new PIXI.Graphics()
    graphics.beginFill(0xff0000)
    graphics.drawRect(50, 50, 100, 100)
    graphics.endFill()
    pixiContainer.addChild(graphics)

    return pixiContainer
}