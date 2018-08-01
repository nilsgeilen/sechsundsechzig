
let log = $('#console')
let canvas = $("#screen")[0]
let ctx = canvas.getContext("2d")
ctx.font = "30px Arial"
ctx.textAlign = "center"


let table = new Table([null, new SimpleAI()])

let img_back = new Image()
img_back.src = "gfx/paris/backs/back.png"

let sound = {
    place: new Audio('snd/cardPlace2.ogg'),
    slide: new Audio('snd/cardSlide2.ogg'),
    meld: new Audio('snd/medieval_loop.ogg')
}

let consts = {
    VISIBILITS_NONE: 0,
    VISIBILITY_OWN: 1,
    VISIBILITY_ALL: 2,

    CARD_WIDTH: 88,
    CARD_HEIGHT: 138,

    WIN_WIDTH: 900,
    WIN_HEIGHT: 500,
}

let options = {
    visibility: consts.VISIBILITY_ALL,
}

function restart() {
    table.deal()
    render(-1)
}



//window.onload = render

canvas.addEventListener('click', function (evt) {
    let mouse = getMousePos(canvas, evt)

    let vps = table.game.result(0)
    if (vps) {
        if (vps === GameState.REMIS)
            alert("Remis!")
        else if (vps > 0)
            alert("Human wins with " + vps)
        else if (vps < 0)
            alert("AI wins with " + -vps)
        else throw "Fail: corrupted result"
    } else if (!table.cleanUp()) {
        if (table.waitingForUserInput()) {
            if (inRect(mouse, 80, 238, 180, 315)) {
                if (!table.game.exchange())
                    table.game.close()
            } else {
                let card = highlight(mouse)
                table.game.play(card)
            }
        } else {
            table.handle()
        }
    }

    if (table.game.trick[0] == null && table.game.trick[1] == null) {
        sound.slide.play()
    } else if (table.game.play_sound_melded) {
        sound.meld.play()
        table.game.play_sound_melded = false
    } else if (table.game.trick[table.game.other()]) {
        sound.place.play()
    }

    render(-1)

    // log.append(game.hands[1].cards.reduce((a, b) => a+" "+b)+"\n")
   // console.log(extractFeatures(game, 0))
}, false)

canvas.addEventListener('mousemove', render, false)

function highlight(mouse) {
    if (mouse.y >= 350 && mouse.y <= 350 + 138) {
        let x = mouse.x - offset(table.game.hands[0])
        return Math.floor(x / 86)
    }
    return -1
}

function getMousePos(canvas, evt) {
    let rect = canvas.getBoundingClientRect()
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    }
}

function inRect(mouse, x1, x2, y1, y2) {
    return mouse.x >= x1 && mouse.x <= x2 && mouse.y >= y1 && mouse.y <= y2
}

function atCard(mouse, x, y) {
    return inRect(mouse, x, x + img_back.width, y, y + img_back.height)
}

function render(evt) {
    let mouse = evt ? getMousePos(canvas, evt) : { x: 0, y: 0 }
    let game = table.game
    let wait_for_user_input = !table.ais[game.active] && !game.trick[game.active]
    

    let highlighted = -1
    if (!table.ais[game.active]) {
        highlighted = highlight(mouse)
        if (mouse.x >= 80 && mouse.x <= 238 && mouse.y >= 180 && mouse.y <= 315) {
            highlighted = game.canExchange()
        }
    }

    let canMeld = game.canMeld(highlighted)

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = "green"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "yellow"

    if (game.deck.size) {
        const closed = game.deck.closed || wait_for_user_input && inRect(mouse, 80, 238, 180, 315) && game.canExchange() === -1
        renderDeck(game.deck, true, closed, 100, 180)
    } else {
        ctx.fillText("Trump: " + Card.SYMBOLS[game.trump], 144, 250)
    }

    renderHand(game.hands[0], true, highlighted, canMeld, 350)
    renderHand(game.hands[1], false, -1, -1, 0)

    if (game.trick[0]) {
        renderCard(game.trick[0], 440 - consts.CARD_WIDTH, 173)
    }
    if (game.trick[1]) {
        renderCard(game.trick[1], 460, 173)
    }



    let x = 750

    if (options.visibility >= consts.VISIBILITY_OWN && game.won[0].cards.length && atCard(mouse, x, 300)) {
        renderPileOpen(game.won[0], x, 300)
    } else {
        renderPile(game.won[0], x, 300)
    }
    if (options.visibility >= consts.VISIBILITY_ALL && game.won[1].cards.length && atCard(mouse, x, 50)) {
        renderPileOpen(game.won[1], x, 50)
    } else {
        renderPile(game.won[1], x, 50)
    }
}

function drawRotated(image, degrees, x, y) {
    //ctx.clearRect(0,0,canvas.width,canvas.height);

    // save the unrotated context of the canvas so we can restore it later
    // the alternative is to untranslate & unrotate after drawing
    ctx.save();

    // move to the center of the canvas
    ctx.translate(x, y);

    // rotate the canvas to the specified degrees
    ctx.rotate(degrees * Math.PI / 180);

    // draw the image
    // since the context is rotated, the image will be rotated also
    ctx.drawImage(image, 0, 0);

    // we’re done with the rotating so restore the unrotated context
    ctx.restore();
}

function renderCard(card, x, y) {
    ctx.drawImage(card.img, x, y)
}

function offset(hand) {
    let w = consts.CARD_WIDTH - 2
    return (consts.WIN_WIDTH - hand.cards.length * w) / 2
}

function renderHand(hand, open, highlighted, canMeld, y) {
    let x = offset(hand)
    for (let i in hand.cards) {
        let yy = y
        if (i == highlighted || i == canMeld) {
            yy -= 10
        }
        if (open)
            renderCard(hand.cards[i], x + 86 * i, yy)
        else
            ctx.drawImage(img_back, x + 86 * i, yy)
    }
}

function renderDeck(deck, show_trump, closed, x, y) {
    if (deck.size) {

        if (!closed && show_trump)
            drawRotated(deck.last.img, 90, x + deck.cards[0].img.height, y + (deck.cards[0].img.height - deck.cards[0].img.width) / 2)
        for (let i = 0; i < deck.size / 2; i++)
            ctx.drawImage(img_back, x - i * 2, y - i * 2)
        if (closed)
            drawRotated(img_back, 90, x - deck.size + deck.cards[0].img.height * 5 / 6, y - deck.size + (deck.cards[0].img.height - deck.cards[0].img.width) / 2)
    }
}

function renderPile(pile, x, y) {
    for (let i = 0; i < pile.cards.length / 2; i++) {
        ctx.drawImage(img_back, x - i * 2, y - i * 2)
    }
    ctx.fillText(pile.sum(), x + 44 - pile.cards.length, y + 80 - pile.cards.length)
}

function renderPileOpen(pile, x, y) {
    let w = consts.CARD_WIDTH - 2
    let step = 9 * w / pile.cards.length
    if (step > w)
        step = w
    x -= pile.cards.length * step - w
    for (let card of pile.cards) {
        renderCard(card, x += step, y)
    }
}


