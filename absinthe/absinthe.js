function shuffle(arr, size) {
    size = size ?? arr.length

    for (let i = size - 1; i >= 0; i--) {
        let rand = Math.floor(Math.random() * i)
        let temp = arr[i]
        arr[i] = arr[rand]
        arr[rand] = temp
    }

    return arr
}

function sum(arr) {
    return arr.reduce((a, b) => a + b, 0)
}

function subsets(arra, arra_size) {
    let set = []
    for (let x = 0; x < Math.pow(2, arra.length); x++) {
        let result = [];
        i = arra.length - 1;
        do {
            if ((x & (1 << i)) !== 0) {
                result.push(arra[i]);
            }
        } while (i--);

        if (result.length == arra_size) {
            set.push(result);
        }
    }
    return set
}

function critmax(crit, arr) {
    let max_crit = 0
    let max_elem = null
    for (let elem of arr) {
        let _crit = crit(elem)
        if (_crit > max_crit) {
            max_crit = _crit
            max_elem = elem
        }
    }
    return max_elem
}


class Suit {
    static SUITS = [
        new Suit('H', 'hearts', '\u2665'),
        new Suit('S', 'spades', '\u2660'),
        new Suit('C', 'clubs', '\u2663'),
        new Suit('D', 'diamonds', '\u2666')
    ]

    constructor(short, verbose, symbol) {
        this.short = short
        this.verbose = verbose
        this.symbol = symbol
    }
}

class Rank {
    static RANKS = [
        new Rank('02', 0),
        new Rank('03', 1),
        new Rank('04', 2),
        new Rank('05', 3),
        new Rank('06', 4),
        new Rank('07', 5),
        new Rank('08', 6),
        new Rank('09', 7),
        new Rank('10', 8),
        new Rank('J', 9),
        new Rank('Q', 10),
        new Rank('K', 11),
        new Rank('A', 12)
    ]

    constructor(symbol, value) {
        this.symbol = symbol
        this.value = value
    }
}

class Card {
    constructor(suit, rank, points) {
        this.suit = suit
        this.rank = rank
        this.points = points
    }

    get name() {
        return this.suit.symbol + this.rank.symbol
    }

    static compare(a, b) {
        return b.rank.value - a.rank.value
    }
}

class Deck {

    constructor(cards, size) {
        this.cards = cards ?? []
        this.size = size ?? this.cards.length
    }

    static fresh(ranks, points) {
        let cards = []
        for (let suit of Suit.SUITS)
            for (let rank of ranks)
                cards.push(new Card(suit, rank, points[rank.value]))

        return new Deck(cards)
    }

    draw() {
        return this.cards[--this.size]
    }

    draw_n(n) {
        return [...Array(n)].map(() => this.draw())
    }

    copy() {
        return new Deck(this.cards, this.size)
    }

    shuffle() {
        shuffle(this.cards, this.size)
    }
}

class PokerCombo {
    constructor(cards, name, score) {
        this.cards = cards
        this.name = name
        this.score = score
    }

    get points() {
        let sigma = 0
        for (let card of this.cards)
            sigma += card.points
        return sigma
    }

    result_against(opposing_combo) {
        return this.score == opposing_combo.score ? 0 : this.score > opposing_combo.score ? opposing_combo.points : -this.points
    }
}

function determine_combo(cards) {
    if (cards.length != 5) {
        console.log('!' + cards.length)
        return
    }

    cards = cards.sort(Card.compare)

    let ranks = {}
    let suits = {}
    for (let card of cards) {
        if (card.rank.value in ranks) {
            ranks[card.rank.value]++
        } else {
            ranks[card.rank.value] = 1
        }

        if (card.suit.short in suits) {
            suits[card.suit.short]++
        } else {
            suits[card.suit.short] = 1
        }
    }

    let max_set = Math.max(...Object.values(ranks))
    let flush = (Object.values(suits).length === 1)
    let straight = true
    for (let i = 1; i < cards.length; i++) {
        if (cards[i].rank.value !== cards[i - 1].rank.value - 1 && !(cards[i - 1].rank.symbol === 'A' && cards[i].rank.symbol === '05')) {
            straight = false
            break
        }
    }

    function hand_value() {
        let full_value = 0
        for (let i = 0; i < 5; i++) {
            full_value += cards[i].rank.value * 13 ** Math.abs(i - 4)
        }
        return full_value
    }

    if (straight && flush)
        return new PokerCombo(cards, 'straight-flush', 8_000_000 + hand_value())

    if (max_set === 4)
        for (let rank in ranks)
            if (ranks[rank] === 4)
                return new PokerCombo(cards, 'four-of-a-kind', 7_000_000 + Number(rank))

    if (max_set === 3 && Object.values(ranks).length === 2)
        for (let rank in ranks)
            if (ranks[rank] === 3)
                return new PokerCombo(cards, 'full-house', 6_000_000 + Number(rank))

    if (flush)
        return new PokerCombo(cards, 'flush', 5_000_000 + hand_value())

    if (straight)
        return new PokerCombo(cards, 'straight', 4_000_000 + hand_value())

    if (max_set === 3)
        for (let rank in ranks)
            if (ranks[rank] === 3)
                return new PokerCombo(cards, 'three-of-a-kind', 3_000_000 + Number(rank))

    if (max_set === 2) {
        let pair_ranks = []
        for (let rank in ranks)
            if (ranks[rank] === 2)
                pair_ranks.push(rank)
        function comp(a, b) {
            if (ranks[a.rank.value] === 2 && ranks[b.rank.value] !== 2)
                return -1
            if (ranks[b.rank.value] === 2 && ranks[a.rank.value] !== 2)
                return 1
            return Card.compare(a, b)
        }
        cards = cards.sort(comp)
        if (pair_ranks.length > 1) {
            return new PokerCombo(cards, 'two-pair', 2_000_000 + hand_value())
        } else {
            return new PokerCombo(cards, 'pair', 1_000_000 + hand_value())
        }
    }

    return new PokerCombo(cards, 'high-card', hand_value())
}

function determine_combos(played_cards, hand) {
    let missing_card_cnt = 5 - played_cards.length
    return subsets(hand, missing_card_cnt).map(sub => determine_combo([...played_cards, ...sub]))
}


function ai_draft(me, opposing_combo, hidden_cards) {
    let missing_card_cnt = 4 - me.combo.length
    console.log('draft')
    console.log(hidden_cards.length)

    let possible_draws = []
    for (let i = 0; i < 100; i++) {
        let deck = new Deck(hidden_cards)
        deck.shuffle()
        possible_draws.push(deck.draw_n(missing_card_cnt * 2 + 1))
    }

    let checked_draws_cnt = possible_draws.length
    let best_score = -1_000_000
    let best_card = null
    for (let i in me.drafting_pool) {
        let card = me.drafting_pool[i]
        let other_card = me.drafting_pool[-(i - 1)]
        let new_combo = [...me.combo]

        let random_opponenet_hands = []
        for (let i = 0; i < 20; i++) {
            let deck = new Deck(hidden_cards)
            deck.shuffle()
            random_opponenet_hands.push([other_card, ...deck.draw_n(me.hand.length + missing_card_cnt * 2 + 1)])
        }
        let random_opponent_combox = random_opponenet_hands.map(hand => critmax(combo => combo.score, determine_combos(opposing_combo, hand)))


        let max_score_per_draw = []
        for (let j = 0; j < checked_draws_cnt; j++) {
            max_score_per_draw.push(critmax(combo => combo.score, determine_combos(new_combo, [...possible_draws[j], ...me.hand, card])))
        }
        let expected_score = sum(max_score_per_draw.map(mc => sum(random_opponent_combox.map(oc => mc.result_against(oc)))))
        console.log(card.name + ' : ' + expected_score)
        if (expected_score > best_score) {
            best_score = expected_score
            best_card = i
        }

    }
    return best_card
}


function ai(me, opposing_combo, hidden_cards) {
    let missing_card_cnt = 4 - me.combo.length
    console.log('play ' + missing_card_cnt)

    let random_opponenet_hands = []
    for (let i = 0; i < 20; i++) {
        let deck = new Deck(hidden_cards)
        deck.shuffle()
        random_opponenet_hands.push(deck.draw_n(me.hand.length + missing_card_cnt * 2))
    }
    let random_opponent_combox = random_opponenet_hands.map(hand => critmax(combo => combo.score, determine_combos(opposing_combo, hand)))

    let possible_draws = []
    for (let i = 0; i < 100; i++) {
        let deck = new Deck(hidden_cards)
        deck.shuffle()
        possible_draws.push(deck.draw_n(missing_card_cnt * 2))
    }

    let checked_draws_cnt = possible_draws.length
    let best_score = -1_000_000
    let best_card = null
    for (let i in me.hand) {
        let card = me.hand[i]
        let new_combo = [...me.combo, card]
        if (missing_card_cnt == 0) {
            let combox = determine_combo(new_combo)
            let expected_score = sum(random_opponent_combox.map(oc => combox.result_against(oc)))
            console.log(card.name + ' : ' + expected_score)
            if (expected_score > best_score) {
                best_score = expected_score
                best_card = i
            }
        } else {
            let max_score_per_draw = []
            for (let j = 0; j < checked_draws_cnt; j++) {
                max_score_per_draw.push(critmax(combo => combo.score, determine_combos(new_combo, [...possible_draws[j], ...me.hand.filter(c => c != card)])))
            }
            let expected_score = sum(max_score_per_draw.map(mc => sum(random_opponent_combox.map(oc => mc.result_against(oc)))))
            console.log(card.name + ' : ' + expected_score)
            if (expected_score > best_score) {
                best_score = expected_score
                best_card = i
            }
        }
    }
    return best_card
}


points = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 21]

class Player {
    hand = []
    combo = []
    drafting_pool = []
    combox = null
    score = 0
}

class GameState {
    player = new Player()
    ai = new Player()
    deck = new Deck()
}

let state = new GameState()

function deal() {
    state.deck = Deck.fresh(Rank.RANKS, points)
    state.deck.shuffle()

    state.player.hand = state.deck.draw_n(2)
    state.player.combo = []
    state.player.drafting_pool = state.deck.draw_n(2)
    state.player.combox = null
    state.ai.hand = state.deck.draw_n(2)
    state.ai.combo = []
    state.ai.drafting_pool = state.deck.draw_n(2)
    state.ai.combox = null

    state.ai.hand.sort(Card.compare)
    state.player.hand.sort(Card.compare)

    draw_state()

}

function draft_card(idx) {
    let cards_hidden_from_ai = state.deck.cards.filter(c => !(c in [...state.ai.hand, ...state.ai.combo, ...state.player.combo]))
    let idx_ai = ai_draft(state.ai, state.player.combo, cards_hidden_from_ai)
    state.ai.hand.push(state.ai.drafting_pool[idx_ai])
    state.player.hand.push(state.ai.drafting_pool[-(idx_ai - 1)])
    state.ai.drafting_pool = []

    state.player.hand.push(state.player.drafting_pool[idx])
    state.ai.hand.push(state.player.drafting_pool[-(idx - 1)])
    state.player.drafting_pool = []

    state.player.hand.sort(Card.compare)
    state.ai.hand.sort(Card.compare)

    draw_state()
}

function play_card(idx) {
    if (state.player.drafting_pool.length) {
        alert('please draft carfs first')
        return
    }

    let cards_hidden_from_ai = state.deck.cards.filter(c => !(c in [...state.ai.hand, ...state.ai.combo, ...state.player.combo]))
    let i = ai(state.ai, state.player.combo, cards_hidden_from_ai)

    let [ai_played_card] = state.ai.hand.splice(i, 1)
    state.ai.combo.push(ai_played_card)

    let [played_card] = state.player.hand.splice(idx, 1)
    state.player.combo.push(played_card)


    if (state.player.combo.length === 5) {
        state.player.combox = determine_combo([...state.player.combo])
        state.ai.combox = determine_combo([...state.ai.combo])
        if (state.player.combox.score > state.ai.combox.score) {
            state.player.score += state.ai.combox.points
        } else if (state.player.combox.score < state.ai.combox.score) {
            state.ai.score += state.player.combox.points
        }
    } else {
        state.player.drafting_pool = state.deck.draw_n(2)
        state.ai.drafting_pool = state.deck.draw_n(2)
    }

    draw_state()
}

function draw_state() {
    function gfx_path(card) {
        return 'gfx/card_' + card.suit.verbose + '_' + card.rank.symbol + '.png'
    }

    $('#drafting_pool').empty()
    if (state.player.drafting_pool.length) {
        $('#drafting_pool').append('select one card ')
        for (let i in state.player.drafting_pool) {
            $('#drafting_pool').append($('<image src=' + gfx_path(state.player.drafting_pool[i]) + ' onclick=draft_card(' + i + ')></image>'))
        }
    }

    $('#ai_hand').empty()
    for (let _ in state.ai.hand)
        $('#ai_hand').append($('<image src=gfx/card_back.png></image>'))

    $('#player_hand').empty()
    for (let i in state.player.hand)
        $('#player_hand').append($('<image src=' + gfx_path(state.player.hand[i]) + ' onclick=play_card(' + i + ')></image>'))

    $('#ai_combo').empty()
    for (let card of state.ai.combo)
        $('#ai_combo').append('<image src=' + gfx_path(card) + '></image>')

    $('#player_combo').empty()
    for (let card of state.player.combo)
        $('#player_combo').append('<image src=' + gfx_path(card) + '></image>')

    if (state.player.combox) {
        $('#player_combo_name').text(state.player.combox.name)
        $('#ai_combo_name').text(state.ai.combox.name)
        if (state.player.combox.score > state.ai.combox.score) {
            $('#player_combo_points').text('(+' + state.ai.combox.points + ')')
        } else {
            $('#ai_combo_points').text('(+' + state.player.combox.points + ')')
        }
    } else {
        $('#player_combo_name').text('')
        $('#ai_combo_name').text('')
        $('#player_combo_points').text('')
        $('#ai_combo_points').text('')
    }

    $('#ai_score').text('ai score: ' + state.ai.score)
    $('#player_score').text('human score: ' + state.player.score)
}



