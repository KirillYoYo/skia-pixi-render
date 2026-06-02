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
    // @ts-ignore Property eventMode does not exist on type Graphics
    g1.eventMode = 'static'
    g1.on('pointerdown', () => {
        console.log('g1 pointerdown!')
    })

    g2.beginFill('#0000ff').drawRect(-50, -75, 100, 150).endFill()
    g2.position.set(120, 60)
    g2.angle = 15
    g2.scale.set(1.5, 1.7)
    // @ts-ignore Property eventMode does not exist on type Graphics
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

    const basicText = new PIXI.Text('Hello Skia!', {
        fontFamily: 'Arial',
        fontSize: 24,
        fill: 0xff1010,
        align: 'center',
        lineHeight: 24,
    })
    basicText.position.set(50, 50)
    mainContainer.addChild(basicText)

    return mainContainer
}

export const getRandomizedPixiContent = async () => {
    const mainContainer = new PIXI.Container()
    const subContainer = new PIXI.Container()

    // Случайные цвета
    const colors = [
        '#ff0000',
        '#00ff00',
        '#0000ff',
        '#ffff00',
        '#ff00ff',
        '#00ffff',
        '#ff8800',
        '#8800ff',
    ]
    const randomColor = () => colors[Math.floor(Math.random() * colors.length)]

    // Случайное количество графических объектов (от 3 до 8)
    const objectCount = Math.floor(Math.random() * 6) + 3

    // Загрузка случайного изображения (опционально)
    let spriteAid = null
    if (Math.random() > 0.5) {
        // 50% шанс добавить спрайт
        try {
            const imagePaths = ['/AID_00100_11zon.jpg']
            const randomImage = imagePaths[Math.floor(Math.random() * imagePaths.length)]
            const texture = await PIXI.Assets.load(randomImage)
            spriteAid = new PIXI.Sprite(texture)
            const randomX = Math.random() * 400 - 200
            const randomY = Math.random() * 300 - 150
            const randomScale = 0.2 + Math.random() * 0.5
            spriteAid.position.set(randomX, randomY)
            spriteAid.scale.set(randomScale, randomScale)
            mainContainer.addChild(spriteAid)
        } catch (error) {
            console.log('Failed to load random image:', error)
        }
    }

    // Создание рандомизированных графических объектов
    for (let i = 0; i < objectCount; i++) {
        const graphic = new PIXI.Graphics()

        // Случайный тип фигуры
        const shapeType = Math.floor(Math.random() * 4) // 0-3

        // Случайный цвет
        const color = randomColor()

        // Случайная прозрачность
        const alpha = 0.5 + Math.random() * 0.5

        graphic.beginFill(color, alpha)

        switch (shapeType) {
            case 0: // Эллипс
                const radiusX = 50 + Math.random() * 150
                const radiusY = 30 + Math.random() * 120
                graphic.drawEllipse(0, 0, radiusX, radiusY)
                break
            case 1: // Прямоугольник
                const width = 40 + Math.random() * 160
                const height = 30 + Math.random() * 150
                graphic.drawRect(-width / 2, -height / 2, width, height)
                break
            case 2: // Круг
                const radius = 20 + Math.random() * 100
                graphic.drawCircle(0, 0, radius)
                break
            case 3: // Многоугольник (треугольник)
                const size = 40 + Math.random() * 120
                graphic.drawPolygon([0, -size / 2, size / 2, size / 2, -size / 2, size / 2])
                break
        }

        graphic.endFill()

        // 30% шанс добавить обводку
        if (Math.random() > 0.7) {
            graphic.lineStyle(2 + Math.random() * 8, randomColor(), 0.5 + Math.random() * 0.5)
            if (Math.random() > 0.5) {
                // Добавить дополнительную линию или форму
                graphic.drawCircle(0, 0, 10 + Math.random() * 30)
            }
        }

        // Случайная позиция
        graphic.position.set(100 + Math.random() * 600, 50 + Math.random() * 400)

        // Случайный угол поворота
        graphic.angle = Math.random() * 360

        // Случайный масштаб
        const scale = 0.5 + Math.random() * 2
        graphic.scale.set(scale, scale)

        // Случайные события (50% шанс)
        if (Math.random() > 0.5) {
            // @ts-ignore TS2339: Property eventMode does not exist on type Graphics
            graphic.eventMode = 'static'
            const events = ['pointerdown', 'pointerup', 'pointerover', 'pointerout']
            const randomEvent = events[Math.floor(Math.random() * events.length)]
            const randomMessage = `Graphic ${i} ${randomEvent}!`
            graphic.on(randomEvent, () => console.log(randomMessage))
        }

        // Случайное добавление в mainContainer или subContainer
        if (Math.random() > 0.7) {
            subContainer.addChild(graphic)
        } else {
            mainContainer.addChild(graphic)
        }
    }

    // Случайные линии (от 0 до 3 линий)
    const lineCount = Math.floor(Math.random() * 4)
    for (let i = 0; i < lineCount; i++) {
        const line = new PIXI.Graphics()
        const lineColor = randomColor()
        const lineWidth = 2 + Math.random() * 15
        const startX = Math.random() * 300
        const startY = Math.random() * 300
        const endX = startX + (Math.random() - 0.5) * 400
        const endY = startY + (Math.random() - 0.5) * 400

        line.lineStyle(lineWidth, lineColor, 0.5 + Math.random() * 0.5)
        line.moveTo(startX, startY)
        line.lineTo(endX, endY)

        // 30% шанс добавить вторую линию
        if (Math.random() > 0.7) {
            const thirdX = endX + (Math.random() - 0.5) * 200
            const thirdY = endY + (Math.random() - 0.5) * 200
            line.lineTo(thirdX, thirdY)
        }

        line.angle = (Math.random() - 0.5) * 90
        mainContainer.addChild(line)
    }

    // Настройка subContainer
    subContainer.position.set(50 + Math.random() * 100, 30 + Math.random() * 100)

    // Случайный порядок добавления объектов
    const allChildren = [...mainContainer.children]
    if (Math.random() > 0.5) {
        // Перемешиваем порядок объектов
        for (let i = allChildren.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[allChildren[i], allChildren[j]] = [allChildren[j], allChildren[i]]
        }
        mainContainer.removeChildren()
        allChildren.forEach(child => mainContainer.addChild(child))
    }

    mainContainer.addChild(subContainer)

    // Добавляем информацию о рандомизации в консоль
    console.log(`Created randomized Pixi content with ${objectCount} shapes and ${lineCount} lines`)

    return mainContainer
}