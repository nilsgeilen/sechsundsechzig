
let log = $('#console')
let canvas = $("#screen")[0]
let ctx = canvas.getContext("2d")



let table = new Table([null, new SimpleAI()])

let img_back = new Image()
img_back.src = "gfx/paris/backs/back.png"
let icon_marriage = new Image()
icon_marriage.src = 'gfx/icons/marriage.png'

let sound = {
    place: new Audio('snd/cardPlace2.ogg'),
    slide: new Audio('snd/cardSlide2.ogg'),
    meld: new Audio('snd/medieval_loop.ogg'),
    shuffle: new Audio('snd/shuffle.wav'),
    fail: new Audio('snd/error.wav')
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
    background: "green",
    foreground: "yellow",
    animation_delay_ms: 900,
}

function restart() {
    table.reset()
    dealt = false
    render()
}

const GAME_LVL = ["remis", "normal", "schneider", "schwarz"]

const DEALING = 'DEALING'
const MARRIAGE = 'MARRIAGE'
const ROYAL_MARRIAGE = 'ROYAL_MARRIAGE'

let animation = null

let dealt = 0

window.onload = render

function animateDealing() {
    animation = DEALING
    setTimeout(() => {
        dealt++
        render()
        if (dealt < 6)
            animateDealing()
        else 
            animation = null
    }, options.animation_delay_ms/6)
}

function animateMarriage(royal) {
    animation = royal ? ROYAL_MARRIAGE : MARRIAGE
    setTimeout(() => {
        animation = null
        render()
    }, options.animation_delay_ms)
}

const timeEvent = function() {
    let curr = () => {}
    return skip => {
        if (skip) {
            curr()
            return
        }
        curr()
        curr = () => skip = true
        setTimeout(() => {
            if (!skip) {
                handleEvent()
            }
        }, options.animation_delay_ms)
    }
}()

function handleAction(action) {
    if (action.meld) {
        sound.meld.play()
        animateMarriage(action.meld.eyes === 40)
    } else if (action.card) {
        sound.place.play()
    } else {
        sound.fail.play()
    }
}

function handleEvent(evt) {
    timeEvent(true)

    let result = table.result()
        
    if (!dealt) {
        animateDealing()
        
        sound.shuffle.play()
    } else if (result) {
        if (result === GameState.REMIS)
            alert("Remis! (65-65)")
        else {
            if (result.player === 'AI') {
                sound.fail.play()
            } else {
                sound.meld.play()
            }
            alert(result.player + " wins the hand "+GAME_LVL[result.points]+" (" + result.points + " points)")
        } 
        dealt = 0
        return
    } else if (table.cleanUp()) {
        sound.slide.play()
    } else if (evt && table.waitingForUserInput()) {
        let mouse = getMousePos(canvas, evt)
            if (inRect(mouse, 80, 238, 180, 315)) {
                if (!table.game.exchange())
                    table.game.close()
                    sound.slide.play()
            } else {
                let card = highlight(mouse)
                handleAction(table.game.play(card))
            }
        } else {
            handleAction(table.handle())
        }

    render(evt)

    if (!table.waitingForUserInput() || table.game.trick[0])
        timeEvent()
}

canvas.addEventListener('click', handleEvent, false)

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
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    ctx.fillStyle = options.background
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = options.foreground


    if (Math.max(...table.points) >= 7) {
        let player = table.players[table.points[0] >= 7 ? 0 : 1];

        ctx.font = "30px Arial"
        ctx.textAlign = "center"
        ctx.fillText("("+table.points[0]+" to "+table.points[1]+')', consts.WIN_WIDTH / 2, consts.WIN_HEIGHT/2+30)
        ctx.fillText(player+ " wins the game", consts.WIN_WIDTH / 2, consts.WIN_HEIGHT/2-30)
        return
    } 

    
    let mouse = evt ? getMousePos(canvas, evt) : { x: 0, y: 0 }
    let game = table.game
    let wait_for_user_input = !table.ais[game.active] && !game.trick[game.active]


    let highlighted = -1
    let highlight_exchange = false
    if (!table.ais[game.active]) {
        highlighted = highlight(mouse)
        if (mouse.x >= 80 && mouse.x <= 238 && mouse.y >= 180 && mouse.y <= 315) {
            highlighted = game.canExchange()
            highlight_exchange = true
        }
    }

    let canMeld = game.canMeld(highlighted)


    ctx.font = "20px Arial"
    ctx.textAlign = "left"

    ctx.fillText("points", 40, 40)
    ctx.fillRect(40, 44, ctx.measureText("points").width, 2);
    for (let i = 0; i < 2; i++)
        ctx.fillText(table.players[i] + ": " +table.points[i], 40, 110- 30 * i)

    if (!dealt) {
        renderPile(game.deck, consts.WIN_WIDTH/2 - consts.CARD_WIDTH/2, 180)
        ctx.fillText("click to deal", consts.WIN_WIDTH/2 - consts.CARD_WIDTH/2 -20, 120)
        return
    }

    if (game.deck.size) {
        const closed = game.deck.closed || wait_for_user_input && inRect(mouse, 80, 238, 180, 315) && game.canExchange() === -1
        renderDeck(game.deck, true, closed, 100, 180, highlight_exchange)
    }

    //$('#trumplbl').text("Trump: " + Card.SYMBOLS[game.trump])
    ctx.fillText("trump", 40, 400)
    let measure = ctx.measureText("trump")
    ctx.fillRect(40, 404, measure.width, 2);

    ctx.font = "40px Arial"
    ctx.textAlign = "center"
    let trump_color = Card.COLORS[game.trump]
    if (trump_color !== options.background)
        ctx.fillStyle = trump_color
    ctx.fillText(Card.SYMBOLS[game.trump], 40 + measure.width/2, 440)
    ctx.fillStyle = options.foreground
    ctx.font = "30px Arial"
    


    renderHand(game.hands[0], true, highlighted, canMeld, 350)
    renderHand(game.hands[1], false, -1, -1, 0)

    if (animation === MARRIAGE || animation === ROYAL_MARRIAGE) {
        ctx.drawImage(icon_marriage, 450 - icon_marriage.width / 2, 200)
        let text = animation === ROYAL_MARRIAGE ? 'Royal Marriage' : 'Marriage'
        ctx.fillText(text, 450, 180)
        let points = animation === ROYAL_MARRIAGE ? 40 : 20;
        ctx.fillText(points, 450, 300)
    } else if (game.outplay) {
        if (game.trick[0]) {
            renderCard(game.trick[0], 460 - consts.CARD_WIDTH, 182)
        }
        if (game.trick[1]) {
            renderCard(game.trick[1], 440, 164)
        }
        } else{
        if (game.trick[1]) {
            renderCard(game.trick[1], 440, 164)
        }
        if (game.trick[0]) {
            renderCard(game.trick[0], 460 - consts.CARD_WIDTH, 182)
        }
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
    cards = hand.cards.slice(0, Math.min(dealt, hand.cards.length))
    let x = offset({cards: cards})
    for (let i in cards) {
        let yy = y
        if (i == highlighted || i == canMeld) {
            yy -= 10
        }
        if (open)
            renderCard(cards[i], x + 86 * i, yy)
        else
            ctx.drawImage(img_back, x + 86 * i, yy)
    }
}

function renderDeck(deck, show_trump, closed, x, y, highlight_trump = false) {
    if (deck.size) {

        if (!closed && show_trump) {
            x_pos =  x + deck.cards[0].img.height
            if (highlight_trump)
                x_pos += 10
            drawRotated(deck.last.img, 90, x_pos, y + (deck.cards[0].img.height - deck.cards[0].img.width) / 2)
        }
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
    if (pile.sum)
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


