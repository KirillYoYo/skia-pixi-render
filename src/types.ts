import * as PIXI from 'pixi.js-legacy'

export type SkiaRenderable = Array<{
    pixiObject: PIXI.Graphics | PIXI.Sprite
    offset: [number, number]
}>