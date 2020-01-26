"use strict";

class Card {
    constructor(suit, rank) {
        this.suit = suit
        this.rank = rank
        this.id = suit + rank * 4
        this.eyes = Card.EYES[rank]
        this.power = Card.POWER[rank]
        this.img = null
        if (!exports) {
            this.img = new Image()
            this.img.src = "gfx/paris/cards/" + Card.SUITS_FULL[suit] + "/" + Card.RANKS_FULL[rank] + ".png"
        }
    }

    toString() {
        return Card.SYMBOLS[this.suit] + Card.RANKS[this.rank]
    }
}

Card.SUITS = ['C', 'H', 'S', 'D']
Card.SUITS_FULL = ['club', 'heart', 'spade', 'diamond']
Card.SYMBOLS = ['\u2663', '\u2665', '\u2660', 	'\u2666']
Card.RANKS = ['A', 'K', 'Q', 'J', '10', '9']
Card.RANKS_FULL = ['ace', 'king', 'queen', 'jack', 'ten', 'nine']

Card.EYES = [11, 4, 3, 2, 10, 0]
Card.POWER = [13, 11, 10, 9, 12, 8]

Card.CLUBS = 0
Card.SPADES = 2
Card.HEARTS = 1
Card.DIAMONDS = 3
Card.NO_TRUMP = -1

Card.ACE = 0
Card.KING = 1
Card.QUEEN = 2
Card.JACK = 3
Card.TEN = 4
Card.NINE = 5

class Deck {
    constructor(card_cnt) {
        this.cards = []
        this.size = card_cnt * 4

        for (let rank = 0; rank < card_cnt; rank++) {
            for (let suit = 0; suit < 4; suit++) {

                this.cards.push(new Card(suit, rank))
            }
        }

        this.ordered = this.cards.slice(0)
        this.last = this.cards[0]
        this.closed = false
        this.closer = -1
    }

    copy() {
        let cp = new Deck(0)
        cp.cards = this.cards
        cp.size = this.size
        cp.ordered = this.ordered
        cp.last = this.last
        cp.closed = this.closed
        cp.closer = this.closer
        return cp
    }

    shuffle() {
        for (let i = this.size - 1; i >= 0; i--) {
            let rand = Math.floor(Math.random() * i)
            let temp = this.cards[i]
            this.cards[i] = this.cards[rand]
            this.cards[rand] = temp
        }

        this.last = this.cards[0]
    }

    draw() {
        if (this.size === 1) {
            --this.size
            return this.last
        } else {
            return this.cards[--this.size]
        }
    }

    exchange(nine) {
        let result = this.last
        this.last = nine
        return result
    }
}

class Hand {
    constructor(deck, size) {
        this.cards = []
        for (let i = 0; i < size; i++) {
            this.draw(deck)
        }
    }

    copy() {
        let cp = new Hand(null, 0)
        cp.cards = this.cards.slice(0)
        return cp
    }

    draw(deck) {
        this.cards.push(deck.draw())
        this.sort(deck.last.suit)
    }

    sort(rightmost) {
        this.cards.sort((a, b) => ((a.suit - rightmost + 3) % 4 - (b.suit - rightmost + 3) % 4) * 100 + a.power - b.power)
    }

    length(suit) {
        return this.cards.reduce((a, b) => a + (b.suit === suit ? 1 : 0), 0)
    }

    canMeld(card) {
        let cards = this.cards

        if (card >= 0 && card < cards.length) {
            if (cards[card].rank === Card.KING) {
                if (card > 0)
                    if (cards[card - 1].rank === Card.QUEEN && cards[card - 1].suit === cards[card].suit)
                        return card - 1;
            } else if (cards[card].rank === Card.QUEEN) {
                let right = parseInt(card) + 1
                if (right < cards.length)
                    if (cards[right].rank === Card.KING && cards[right].suit === cards[card].suit)
                        return right;
            }
        }
        return -1
    }

    toString() {
        return this.cards.reduce((a, b) => a + " " + b)
    }
}

class Meld {
    constructor(eyes, suit) {
        this.eyes = eyes
        this.suit = suit
    }
}

class Tricks {
    constructor() {
        this.cards = []
        this.melds = []
    }

    copy() {
        let cp = new Tricks()
        cp.cards = this.cards.slice(0)
        cp.melds = this.melds.slice(0)
        return cp
    }

    add(trick) {
        for (let card of trick)
            this.cards.push(card)
    }

    meld(canMeld) {
        this.melds.push(canMeld)
    }

    sum() {
        if (this.cards.length)
            return this.cards.reduce((a, b) => a + b.eyes, 0) + this.melds.reduce((a, b) => a + b.eyes, 0)
        else
            return 0
    }
}

const GameState = function () {
    class GameState {
        constructor(game) {
            if (game) {
                this.deck = game.deck.copy()
                this.active = game.active
                this.hands = [game.hands[0].copy(), game.hands[1].copy()]
                this.trump = game.trump
                this.trick = [game.trick[0], game.trick[1]]
                this.won = [game.won[0].copy(), game.won[1].copy()]
                this.eyes_when_closed = game.eyes_when_closed
                this.play_sound_melded = game.play_sound_melded
            } else {
                this.deck = new Deck(6)
                this.deck.shuffle()
                this.active = Math.floor(Math.random()*2)//Math.round(Math.random())
                this.hands = [new Hand(this.deck, 6), new Hand(this.deck, 6)]
                this.trump = this.deck.last.suit
                this.trick = [null, null]
                this.won = [new Tricks(), new Tricks()]
                this.eyes_when_closed = 0
                this.play_sound_melded = false
            }
        }

        cripple() {
            let cripple = new GameState(this)
            cripple.hands[cripple.other()].cards = []
            cripple.deck.cards = []
            return cripple
        }

        winner() {
            let other = -(this.active - 1)
            if (this.trick[this.active].suit === this.trick[other].suit) {
                return this.trick[this.active].power > this.trick[other].power ? this.active : other
            } else if (this.trick[this.active].suit === this.trump) {
                return this.active
            } else {
                return other
            }
        }

        legalAsList() {
            let cards = this.hands[this.active].cards
            let other = this.other()
            if (this.phase() !== GameState.PHASE_1 && this.trick[other]) {
                const ll = __legal(this, cards, other)
                /*let result = []
                for (let i in ll) {
                    if (ll[i])
                        result.push(i)
                }
                return result */
                return __RANGE[cards.length].filter(n => ll[n])
            } else return __RANGE[cards.length].slice(0)
        }

        legal() {
            let cards = this.hands[this.active].cards
            let other = this.other()
            if (this.phase() !== GameState.PHASE_1 && this.trick[other]) {
                return __legal(this, cards, other)
            } else return __LISTS_TRUE[cards.length].slice(0)

        }

        other() {
            return -(this.active - 1)
        }

        static neg(player) {
            return -(player - 1)
        }

        cleanUp() {
            if (this.trick[0] && this.trick[1]) {
                this.trick = [null, null]
                if (this.phase() === GameState.PHASE_1) {
                    this.hands[this.active].draw(this.deck)
                    this.hands[this.other()].draw(this.deck)
                }
                return true
            } else return false
        }

        playIgnoreRules(card) {
            this.trick[this.active] = card
            __evalTrick(this)
        }

        play(card) {
            if (this.trick[0] && this.trick[1])
                throw "cannot play card until trick was cleaned up"
            if (card >= 0 && card < this.hands[this.active].cards.length) {
                if (this.phase() !== GameState.PHASE_1 && this.trick[-(this.active - 1)]) {
                    let ll = this.legal()
                    if (!ll[card])
                        return
                }

                if (!this.trick[this.other()]) {
                    if (this.canMeld(card) !== -1) {
                        let suit = this.hands[this.active].cards[card].suit
                        this.won[this.active].meld(new Meld(suit === this.trump ? 40 : 20, suit))
                        this.play_sound_melded = true
                    }
                }

                [this.trick[this.active]] = this.hands[this.active].cards.splice(card, 1)

                __evalTrick(this)
            }
        }

        canMeld(card, player = this.active) {
            if (this.trick[this.other()] || this.phase() !== GameState.PHASE_1)
                return -1
            return this.hands[player].canMeld(card)
        }

        canExchange() {
            if (this.deck.last.rank !== Card.NINE)
                if (this.trick[this.other()] == null)
                    if (this.deck.size) {
                        let cards = this.hands[this.active].cards
                        for (let i in cards) {
                            if (cards[i].rank === Card.NINE && cards[i].suit === this.trump) {
                                return i
                            }
                        }
                    }
            return -1
        }

        exchange() {
            let i = this.canExchange()
            if (i == -1)
                return false
            let cards = this.hands[this.active].cards
            cards[i] = this.deck.exchange(cards[i])
            this.hands[this.active].sort(this.trump)
            return true
        }

        close() {
            if (this.deck.closed)
                return
            this.deck.closed = true
            this.deck.closer = this.active
            this.eyes_when_closed = this.won[this.other()].sum()
            if (this.eyes_when_closed === 0 && this.won[this.other()].cards.lenght)
                this.eyes_when_closed = 1
        }

        points(player = this.active, phase = this.phase()) {
            let other = GameState.neg(player)
            if (phase === GameState.PHASE_CLOSED) {
                if (player === this.deck.closer) {
                    if (this.won[player].sum() >= 66) {
                        if (this.eyes_when_closed === 0) {
                            return 3
                        } else if (this.eyes_when_closed <= 33) {
                            return 2
                        } else {
                            return 1
                        }
                    }

                } else {

                    if (this.won[player].sum() >= 66) {
                        if (this.won[other].cards.length === 0) {
                            return 3
                        } else {
                            return 2
                        }
                    }

                    if (this.hands[player].cards.length === 0
                        && this.hands[other].cards.length === 0) {
                        let eyes = this.won[other].sum()
                        if (this.won[other].cards.length === 0)
                            return 3
                        if (eyes < 66)
                            return 2
                    }
                }
            } else {
                if (this.won[player].sum() >= 66) {
                    let eyes = this.won[other].sum()
                    if (this.won[other].cards.length === 0)
                        return 3
                    if (eyes <= 33)
                        return 2
                    else
                        return 1
                }
            }

            return 0
        }

        result(player = this.active) {
            let phase = this.phase()
            let p = this.points(player, phase)
            if (p)
                return p
            p = this.points(GameState.neg(player), phase)
            if (p)
                return -p
            if (this.hands[0].cards.length === 0
                && this.hands[1].cards.length === 0)
                return GameState.REMIS
            else return GameState.UNDEC
        }

        phase() {
            if (this.deck.closed)
                return GameState.PHASE_CLOSED
            else if (this.deck.size)
                return GameState.PHASE_1
            else
                return GameState.PHASE_2
        }

        hasBeenPlayed(suit, rank) {
            for (let i = 0; i < 2; i++)
                for (let card of this.won[i].cards)
                    if (card.suit === suit && card.rank === rank)
                        return true
            return false
        }

        unknownCards() {
            let unknown = []
            for (let i in this.deck.ordered)
                unknown.push(true)
            for (let loc of [this.hands[this.active].cards, this.trick, this.won[0].cards, this.won[1].cards])
                for (let card of loc)
                    if (card)
                        unknown[card.id] = false
            if (this.deck.size) {
                unknown[this.deck.last.id] = false
            }
            let result = []
            for (let i in unknown)
                if (unknown[i])
                    result.push(this.deck.ordered[i])
            return result

        }
    }

    const __LISTS_FALSE = Array(7).fill(null).map((_, i) => Array(i).fill(false))
    const __LISTS_TRUE = Array(7).fill(null).map((_, i) => Array(i).fill(true))
    const __RANGE = [...Array(7).keys()].map(n => [...Array(n).keys()])

    GameState.PHASE_1 = 1
    GameState.PHASE_2 = 2
    GameState.PHASE_CLOSED = 3

    GameState.REMIS = "remis"
    GameState.UNDEC = 0

    function __legal(game, cards, other) {
        let result = __LISTS_FALSE[cards.length].slice(0)
        for (let i in cards)
            if (cards[i].suit === game.trick[other].suit && cards[i].power > game.trick[other].power)
                result[i] = true
        if (result.includes(true))
            return result
        for (let i in cards)
            if (cards[i].suit === game.trick[other].suit)
                result[i] = true
        if (result.includes(true))
            return result
        for (let i in cards)
            if (cards[i].suit === game.trump)
                result[i] = true
        if (result.includes(true))
            return result
        else return __LISTS_TRUE[cards.length].slice(0)
    }

    function __evalTrick(game) {
        if (game.trick[0] && game.trick[1]) {
            let winner = game.winner()
            game.won[winner].add(game.trick)
            if (game.hands[winner].cards.length === 0 && game.phase() === GameState.PHASE_2)
                game.won[winner].meld(new Meld(10, 0))
            //  this.trick = [null, null]
            game.active = winner
        } else {
            game.active = -(game.active - 1)
        }
    }

    return GameState
}()

class Table {
    constructor(ais) {
        this.game = new GameState()
        this.ais = ais
        this.players = ["Human", "AI"]
        this.points = [0,0]
    }

    reset() {
        this.game = new GameState()
        this.points = [0,0]
    }

    deal() {
        this.game = new GameState()
    }

    result() {
        let vps = this.game.result(0)
        if (vps) {
            this.deal()
            if (vps === GameState.REMIS)
                return {remis:true}
            let [winner, points] = vps > 0 ? [0, vps] : [1, -vps]
            let game = (this.points[winner] += points) >= 7
            let player = this.players[winner]
            return {player, points, game}
        }
    }

    cleanUp() {
        return this.game.cleanUp()
    }

    handle() {
        this.cleanUp()
        this.game.exchange()
        this.game.play(this.ais[this.game.active].handle(this.game.cripple()))
    }

    waitingForUserInput() {
        return !this.ais[this.game.active]
    }

    simulate (N=1) {
        if (!this.ais[0] || !this.ais[1])
            throw "Fail: simulation only possible with two ais"

        let result = [0, 0]
        for (let  i = 0; i < N ; i++) {
            this.deal()
            while (true) {
                this.handle()

                let vps = this.game.result(0)
                if (vps) {
                    if (vps > 0)
                        result[0] += vps
                    else if (vps < 0)
                        result[1] -= vps
                    break
                }
            }
        }            
        return result
    }

    static simulate (ai1, ai2, N=1) {
        let result1 = new Table([ai1, ai2]).simulate(N)
        let result2 = new Table([ai2, ai1]).simulate(N)
        return [result1[0] + result2[1], result1[1] + result2[0]]
    }
}

if (exports) {
    exports.GameState = GameState
    exports.Card = Card
    exports.Table = Table

}

