const logic = require('../logic.js')
const ai = require('../ai.js')

let size = process.argv[2]

let ais = [new ai.SimpleAI(new ai.SimpleHandEvaluator()), new ai.SimpleAI(new ai.SimpleHandEvaluator())]

console.log("[")

let first = true

while (size > 0) {
    let game = new logic.GameState()

    let vecs = [[], []]

    while (true) {
        if (game.trick[0] && game.trick[1])
            game.cleanUp()
        game.exchange()
        game.play(ais[game.active].handle(game.cripple()))

        if (game.phase() === GameState.PHASE_1) {
            vecs[0].push(ai.extractFeatures(game, 0))
            vecs[1].push(ai.extractFeatures(game, 1))
        }

        if (game.points(0) || game.points(1))
            break

        if (!game.hands[0].cards.length && !game.hands[1].cards.length)
            break
    }

    size -= vecs[0].length + vecs[1].length

    let p = game.points(0) - game.points(1)



    for (let vec of vecs[0]) {
        if (first)
            first = false
        else
            console.log(',')
        console.log(JSON.stringify({ x: vec, y: p }))
    }

    for (let vec of vecs[1]) {
        console.log(',')
        console.log(JSON.stringify({ x: vec, y: -p }))
    }
}

console.log("]")