import * as PIXI from 'pixi.js-legacy'

export const getPixiContent = async () => {
    const mainContainer = new PIXI.Container()
    const subContainer = new PIXI.Container()
    const g1 = new PIXI.Graphics()
    const g2 = new PIXI.Graphics()
    const g3 = new PIXI.Graphics()
    const g4 = new PIXI.Graphics()
    const g5 = new PIXI.Graphics()

    const texture = await PIXI.Assets.load('/AID_00100_11zon.jpg')
    const spriteAid = new PIXI.Sprite(texture)
    spriteAid.position.set(-100, 0)
    spriteAid.scale.set(0.3, 0.3)

    g1.beginFill('#ff0000').drawEllipse(0, 0, 200, 100).endFill()
    g1.position.set(200, 100)
    g1.angle = 30
    g1.eventMode = 'static'
    g1.on('pointerdown', () => {
        console.log('g1 pointerdown!')
    })

    g2.beginFill('#0000ff').drawRect(-50, -75, 100, 150).endFill()
    g2.position.set(120, 60)
    g2.angle = 15
    g2.scale.set(1.5, 1.7)
    g2.eventMode = 'static'
    g2.on('pointerup', () => {
        console.log('g2 pointerup!')
    })

    g3.lineStyle(10, '#ffffff', 1).moveTo(0, 0).lineTo(150, 100)
    g3.angle = -20

    g4.lineStyle(10, '#ffff00', 1).moveTo(0, 70).lineTo(150, -30)
    g4.angle = 20

    const anotherContainer = new PIXI.Container()
    g5.beginFill('#0000ff').drawRect(-20, -55, 50, 50).endFill()
    g5.position.set(250, 60)
    anotherContainer.addChild(g5)

    mainContainer.addChild(spriteAid)
    subContainer.position.set(75, 50)
    subContainer.addChild(g3, g4)
    mainContainer.addChild(g1, g2, subContainer)
    mainContainer.addChild(anotherContainer)

    return mainContainer
}