
const logic = require('../logic.js')
const ai = require('../ai.js')




compare 
    (new ai.SimpleAI(), "simple")  
    (new ai. SimpleAI2(500), "simple(500)") 
    (new ai. SimpleAI2(1000), "simple(1000)") 
    (new ai. SimpleAI2(2000), "simple(2000)")  
    (2500)


function compare (ai, name) {
    let ais = []
    f(ai, name)
    return f 

    function f (ai, name) {
        if (name) {
            ai.name = name
            ais.push(ai)
        } else {
            let n = ai
            let won = new Array(ais.length).fill(0)
            let lost = new Array(ais.length).fill(0)

            for (let i = 0; i < ais.length; i++) {
                for (let j = i+1; j < ais.length; j++) {
                    let [pi, pj] = logic.Table.simulate(ais[i], ais[j], n)
                    console.log(ais[i].name + "\t" + pi + " : " + pj + "\t" + ais[j].name)
                    won[i] += pi
                    lost[i] += pj
                    won[j] += pj
                    lost[j] += pi
                }
            }

            console.log()

            for (let i = 0; i < ais.length; i++) {
                console.log(ais[i].name + "\t" + won[i] + " : " + lost[i])
            }
        }

        return f
    }
}


