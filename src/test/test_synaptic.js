const synaptic = require("../../lib/synaptic.js")
const fs = require("fs");

let vec_norm = i => v => Math.pow(v.reduce((a,b) => a + Math.pow(b,i), 0),1/i)

console.log(vec_norm(2)([1,0]))
console.log(vec_norm(2)([1,2]))
console.log(vec_norm(1)([1,2]))


if (false) {
var train = JSON.parse(fs.readFileSync("../../dat/train.json"))
train = train.map((a) => ({input: a.x, output: [(a.y+3)/6]}))

var test = JSON.parse(fs.readFileSync("../../dat/test.json"))
test = test.map((a) => ({input: a.x, output: [(a.y+3)/6]}))

train = train.slice(0,1000)

/* for (let i of train)
    console.log(i.y) */



let myNetwork = new synaptic.Architect.Perceptron(53, 50, 1)
let trainer = new synaptic.Trainer(myNetwork)



//let train = mkSet(1000)
//let test = mkSet(100)

trainer.train(train)

for (let x of test) {
    console.log(Number.parseFloat(myNetwork.activate(x.input)).toFixed(4) + "   "+ x.output)
}  
}





function mkSet(size) {
    let set = []
    for (let i = 0; i < size; i++) {
        let input = []
        for (let j = 0; j < 50; j++)
            input.push(Math.round(Math.random()))
        let output = [(input[1] && input[49] || input[3]&& input[47])?1:0]
        set.push({
            input: input,
            output: output
        })

    }
    return set
}

