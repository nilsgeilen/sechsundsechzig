const logic = require('../logic.js')
const ai = require('../ai.js')

let N = 250000

let rando = new ai.RandomAI()

let testset = []
while (testset.length < N) {
    let state = new logic.GameState()
    while (state.phase() === logic.GameState.PHASE_1) {
        if (state.trick[0] && state.trick[1])
                state.cleanUp()
        state.exchange()
        state.play(rando.handle(state.cripple()))
    }
    if (state.phase() === logic.GameState.PHASE_2) {
        if (state.trick[0] && state.trick[1])
                state.cleanUp()
        testset.push(state)
    }
}

let results1 = []
let results2 = []

let ai_min_max = new ai.MinMaxAI()
let ai_alpha_beta = new ai.AlphaBetaAI

console.time("minmax")
for (let state of testset) {
    results1.push(ai_min_max.minmax(state.cripple(), true))
    results1.push(ai_min_max.minmax(state.cripple()))
}
console.timeEnd("minmax")

console.time("alphabeta")
for (let state of testset) {
    results2.push(ai_alpha_beta.minmax(state.cripple(), -100, true))
    results2.push(ai_alpha_beta.minmax(state.cripple(), -100))
}
console.timeEnd("alphabeta")

assertEqual (testset.length, N)
assertEqual (results1.length, N*2)
assertEqual (results2.length, N*2)

for (let i in results1)
    assertEqual (results1[i], results2[i])



function assert (f) {
    let r = f()

}

function is (a) {
    return a
}

function equal (a,b) {
    if (a === b)
        return false
    else return +a+ " != " +b
}

function assertEqual(a,b) {
    if (a!==b)
        console.log("error:\t" +a+ " != " +b)
   // else
     //   console.log("success:\t" +a+ " == " +b) 
}

function assertGTE(a,b) {
    if (a < b) {
        console.log("error:\t" +a+ " < " +b)
    }
}