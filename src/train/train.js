const logic = require('../logic.js')
const ai = require('../ai.js')


/* let conf = select()
console.log(conf)

console.log(compare([new ai.SimpleAI(conf), new ai.SimpleAI()], 30))
console.log(compare([new ai.SimpleAI(conf), new ai.RandomAI()], 30))
console.log(compare([new ai.SimpleAI(), new ai.RandomAI()], 30)) */


let adjai = new ai.SimpleHandEvaluator()
for (let i in adjai.trump_val)
    adjai.trump_val[i] += 10
adjai.trump_val[logic.Card.NINE] += 4

console.time("a")
console.log(compare([new ai.SimpleAI(adjai), new ai.SimpleAI()], 1000))
console.log(compare([new ai.SimpleAI(adjai), new ai.RandomAI()], 1000))
console.log(compare([new ai.SimpleAI(), new ai.RandomAI()], 1000))
console.timeEnd("a")


function select() {
    let pop_size = 3
    let pop = []
    for (let i = 0; i< pop_size; i++)
        pop.push(new ai.SimpleHandEvaluator())

    for (let i in pop) {
        pop[i] = train(pop[i], 25)
    }

    for (let i = 0; i < pop_size; i++)
        for (let j = i+1; j < pop_size; j++)
            for (let k = 0; k < 3; k++)
                pop.push(pop[i].cross(pop[j]))

    let points = []
    for (let i = 0; i < pop.length; i++) {
        points.push(0)
        console.log(pop[i])
    }
    for (let i = 0; i < pop.length; i++)
        for (let j = i+1; j < pop.length; j++) {
            let ps = compare([new ai.SimpleAI(pop[i]), new ai.SimpleAI(pop[j])], 7)
            points[i] += ps[0]
            points[j] += ps[1]
        }

    console.log(points)

    let  max = 0
    let max_pos = 0
    for (let i in points)
        if (points[i] > max) {
            max=points[i]
            max_pos = i
        }
    console.log(max_pos)
    return pop[max_pos]
}

function train (old, K) {
    let nu = new ai.SimpleHandEvaluator(old)

    for (let k = 0; k < K; k++) {
     //   if (k % 100 === 0)
            console.log(k)

        nu = new ai.SimpleHandEvaluator(old)
        nu.mutate()
        let ais = [new ai.SimpleAI(old), new ai.SimpleAI(nu)]

        let points = compare(ais, 15)

        if (points[1] > points[0])
            old = nu
    }

    return old
}

function compare(ais, iterations) {
    let points = [0, 0]
    gameloop: for (let i = 0; i < iterations; i++) {

        let game = new logic.GameState()

        while (true) {
            if (game.trick[0] && game.trick[1])
                game.cleanUp()
            game.exchange()
            game.play(ais[game.active].handle(game.cripple()))

            for (let j of [0, 1]) {
                let p = game.points(j)
                if (p) {
                    points[j] += p
                    continue gameloop
                }
            }
            if (!game.hands[0].cards.length && !game.hands[1].cards.length)
                continue gameloop
        }
    }
    return points
}