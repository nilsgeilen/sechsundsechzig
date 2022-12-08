if (exports) {
    const logic = require('./logic.js')
    Card = logic.Card
    GameState = logic.GameState
}

class RandomAI {
    handle(game) {
        game.exchange()
        let ll = game.legal()
        while (true) {
            let card = Math.floor(Math.random() * game.hands[game.active].cards.length)
            if (ll[card]) {
                return card
            }
        }
    }
}

class MinMaxAI {
    constructor() {
        this.max_depth = 12

    }

    handle(game) {
        game.hands[game.other()].cards = game.unknownCards()

        return this.minmax(game, 0, true)
    }

    minmax(game, return_card_pos) {

        game.cleanUp()

        let ll = game.legalAsList()

        if (ll.length === 0) {
            return 0
        }

        if (return_card_pos)
            if (ll.length === 1)
                return ll[0]

        //let actor = game.active
        let max = -100
        let pos = ll[0]
        for (let card of ll) {
            let state = new GameState(game)
            state.play(card)
            let points_active = state.points(game.active)
            if (points_active)
                return return_card_pos ? card : points_active
            let points_other = state.points(game.other())
            if (points_other && -points_other > max) {
                max = -points_other
                pos = card
            } else {
                let points = this.minmax(state)
                if (game.active !== state.active)
                    points *= -1
                if (points > max) {
                    max = points
                    pos = card
                }
            }
        }

        return return_card_pos ? pos : max
    }
}

class AlphaBetaAI {
    constructor() {
        this.max_depth = 12

    }

    handle(game) {
        game.hands[game.other()].cards = game.unknownCards()

        return this.minmax(game, 0, -100, true)
    }

    minmax(game, alpha, return_card_pos) {
        game.cleanUp()

        let ll = game.legalAsList()

        if (ll.length === 0) {
            return 0
        }

        if (return_card_pos)
            if (ll.length === 1)
                return ll[0]

        let max = -100
        let pos = ll[0]
        for (let card of ll) {
            let state = new GameState(game)
            state.play(card)
            let points_active = state.points(game.active)
            if (points_active)
                return return_card_pos ? card : points_active
            let points_other = state.points(game.other())
            if (points_other && -points_other > max) {
                max = -points_other
                pos = card
            } else {
                let points = this.minmax(state, max)
                if (game.active !== state.active)
                    points *= -1
                if (points > max) {
                    max = points
                    pos = card
                }
            }
            if (game.active !== state.active) {
                if (-alpha <= max)
                    return return_card_pos ? pos : max
            } 
        }

        return return_card_pos ? pos : max
    }
}

class SimpleHandEvaluator {
    constructor(config) {
        if (config) {
            for (let prop in config) {
                if (config[prop] instanceof Array)
                    this[prop] = config[prop].slice(0)
                else
                    this[prop] = config[prop]
            }
        } else {
            this.outplay = 1.0
            this.marriage_active = 15.0
            this.marriage_passive = 10.0
            this.candidate = 2.5
            this.royal_marriage_active = 30.0
            this.royal_marriage_passive = 20.0
            this.royal_candidate = 5.0

            this.schneider = 15.0
            this.schwarz = 15.0

            this.card_val = Card.EYES.map(eyes => 0.25 * eyes)

            this.trump_val = Card.EYES.map(eyes => eyes + 15.0)
        }
    }


    mutate() {
        let diff = (x) => (1.1 - Math.random() * 0.2) * x + (0.1 - Math.random() * 0.2)

        for (let prop in this) {
            if (this[prop] instanceof Array) {
                for (let i in this[prop])
                    this[prop][i] = diff(this[prop][i])
            } else {
                this[prop] = diff(this[prop])
            }
        }

    }

    cross(other) {
        let combine = (x, y) => x + (y - x) * Math.random()

        let result = new SimpleHandEvaluator()

        for (let prop in this) {
            if (this[prop] instanceof Array) {
                for (let i in this[prop])
                    result[prop][i] = combine(this[prop][i], other[prop][i])
            } else {
                result[prop] = combine(this[prop], other[prop])
            }
        }

        return result
    }

    evalCard(game, card) {
        if(card.suit === game.trump)
            return this.trump_val[card.rank]
        else return this.card_val[card.rank]
    }
    
    evalHand(game, player) {
        let outplay = game.active === player
        let result = outplay ? this.outplay : 0
        let cards = game.hands[player].cards
        for (let i in cards) {
            result += this.evalCard(game, cards[i])

            if (game.deck.size > 4 || game.deck.size === 4 && outplay) {
                if (cards[i].rank === Card.KING) {
                    if (game.canMeld(i, player)) {
                        if (cards[i].suit === game.trump) {
                            if (outplay)
                                result += this.royal_marriage_active
                            else
                                result += this.royal_marriage_passive
                        } else {
                            if (outplay)
                                result += this.marriage_active
                            else
                                result += this.marriage_passive
                        }
                    } else if (!game.hasBeenPlayed(cards[i].suit, Card.QUEEN)) {
                        if (cards[i].suit === game.trump)
                            result += this.royal_candidate
                        else result += this.candidate
                    }
                } else if (cards[i].rank === Card.QUEEN && !game.hasBeenPlayed(cards[i].suit, Card.KING)) {
                    if (cards[i].suit === game.trump)
                        result += this.royal_candidate
                    else result += this.candidate
                }
            }
        }

        let eyes_won = game.won[player].sum()
        let eyes_lost = game.won[GameState.neg(player)].sum()

        result += eyes_won
        if (eyes_lost >= 45) {
            if (eyes_won < 33)
                result += this.schneider
            if (eyes_won === 0) {
                result += this.schwarz
            }
        }

        result -= eyes_lost
        if (eyes_won >= 45) {
            if (eyes_lost < 33)
                result -= this.schneider
            if (eyes_lost === 0) {
                result -= this.schwarz
            }
        }

        return result 
    }
}

class SimpleAI {
    constructor(evalor = new SimpleHandEvaluator()) {
        this.evalor = evalor
        this.minmax = new AlphaBetaAI()
    }


    handle(game) {
        if (game.phase() === GameState.PHASE_2)
            return this.minmax.handle(game)
        if (game.trick[game.other()])
            return this.second(game)
        else
            return this.first(game)
    }

    first(game) {
        let unknown = game.unknownCards()
        let p = pDrawMax(6, unknown.length)
        let outcome = []
        for (let i in game.hands[game.active].cards) {
            let outcome2 = []
            for (let card of unknown) {
                let state = new GameState(game)
                state.play(i)
                // marriage won the game
                if (state.points(game.active))
                    return i
                state.playIgnoreRules(card)
                state.exchange()
                outcome2.push(this.evalor.evalHand(state, game.active) + this.evalor.evalCard(state, card))
            }
            outcome2.sort((a, b) => a - b)
            let sum = 0
            for (let j in p) {
                sum += p[j] * outcome2[j]
            }
            outcome.push(sum)
        }
        console.log(outcome)
        let max = outcome[0]
        let pos = 0
        for (let i in outcome) {
            if (outcome[i] > max) {
                max = outcome[i]
                pos = i
            }
        }
        return pos
    }

    second(game) {
        let ll = game.legalAsList()
        let outcome = []
        for (let i of ll) {
            let state = new GameState(game)
            state.play(i)
            if (state.points(game.active))
                return i
            state.exchange()
            outcome.push(this.evalor.evalHand(state, game.active))
        }
        console.log(outcome)
        let max = outcome[0]
        let pos = ll[0]
        for (let i in ll) {
            if (outcome[i] > max) {
                max = outcome[i]
                pos = ll[i]
            }
        }
        return pos
    }
}


class StochasticMinMaxAI {
    constructor (evalor = new SimpleHandEvaluator()) {
        this.evalor = evalor
        this.minmax = new AlphaBetaAI()
    }

    handle(game) {
        if (game.phase() === GameState.PHASE_2)
            return this.minmax.handle(game)
        let unknown = game.unknownCards()
    }

    minmax (game, me, unknown, return_card_pos = false) {
        game.cleanUp()

        if (me === game.active) {
            let ll = game.legalAsList()
        } else {
            let p = pDrawMax(6, unknown.length)
            let outcome = []
        }
    }
}



function extractFeatures(game, player) {
    let other = GameState.neg(player)
    let card_cnt = game.deck.ordered.length

    let suit_seq = [Card.CLUBS, Card.HEARTS, Card.SPADES, Card.DIAMONDS].map((x) => [game.trump === x ? 100 : game.hands[player].length(x), x]).sort((a, b) => a[0] < b[0])
    let suit_order = []
    for (let i in suit_seq)
        suit_order[suit_seq[i][1]] = i * 1

    let features_hand = Array(card_cnt).fill(0)
    for (let card of game.hands[player].cards)
        features_hand[suit_order[card.suit] + card.rank * 4] = 1

    let features_played = Array(card_cnt).fill(0)
    for (let i = 0; i < 2; i++)
        for (let card of game.won[i].cards)
            features_played[suit_order[card.suit] + card.rank * 4] = 1

    let features_other = []
    features_other.push(game.won[player].sum() / 66)
    features_other.push(game.won[other].sum() / 66)
    features_other.push(game.active === player ? 1 : 0)
    features_other.push(game.deck.size / card_cnt * 2)
    features_other.push(game.deck.last.eyes / 11)


    return features_hand.concat(features_played).concat(features_other)
}


/**
 * Assume N numbered marbles. Out of these, x are drawn. For every marble, this function computes the probabilty that it is the most highly marble 
 * among the x drawn marbles. This is represented by an array of probabilties, starting with the probability of the most highly numbered marble
 * @param {*} x 
 * @param {*} N 
 */
function pDrawMax(x, N) {
    let I = 1
    let result = []
    for (let n = N; I > 0; n--) {
        let p_n = I * 6 / n
        result.push(p_n)
        I -= p_n
    }
    return result
}

function subsets(vals, permutation_size) {
    let labels = []
    for (let i = 0; i < vals.length; i++) {
        labels.push(true)
    }

    let results = []
    let permutation = []
    let i = 0
    loop: while (true) {
        if (i === vals.length) {
            while (true) {
                if (--i < 0) {
                    break loop
                }
                if (labels[i]) {
                    labels[i] = false
                    permutation = []
                    i = -1
                    break
                } else {
                    labels[i] = true
                }

            }
        } else if (labels[i]) {
            permutation.push(vals[i])
            if (permutation.length === permutation_size) {
                results.push(permutation)
                permutation = []
                labels[i] = false
                i = -1
            }
        }
        i++
    }

    return results
}

if (exports) {
    exports.SimpleAI = SimpleAI
    exports.SimpleAI2 = SimpleAI2
    exports.SimpleHandEvaluator = SimpleHandEvaluator
    exports.RandomAI = RandomAI
    exports.MinMaxAI = MinMaxAI
    exports.AlphaBetaAI = AlphaBetaAI
    exports.extractFeatures = extractFeatures
}


