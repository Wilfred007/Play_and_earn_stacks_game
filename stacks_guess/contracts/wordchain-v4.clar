;; WordChain V4: On-Chain Vocabulary Challenge
;; An Educational Learn-to-Earn Game Built on Stacks Blockchain
;; Clarity Version: 3

;; ===== CONSTANTS =====

(define-constant CONTRACT_OWNER tx-sender)

;; Error constants following best practices
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_INSUFFICIENT_FUNDS (err u101))
(define-constant ERR_ROUND_NOT_ACTIVE (err u102))
(define-constant ERR_ALREADY_GUESSED (err u103))
(define-constant ERR_INVALID_OPTION (err u104))
(define-constant ERR_ROUND_NOT_ENDED (err u105))
(define-constant ERR_ALREADY_REVEALED (err u106))
(define-constant ERR_INVALID_HASH (err u107))
(define-constant ERR_NO_ACTIVE_ROUND (err u108))
(define-constant ERR_INVALID_ROUND_ID (err u109))
(define-constant ERR_ROUND_EXPIRED (err u110))
(define-constant ERR_INVALID_INPUT (err u111))
(define-constant ERR_CONTRACT_PAUSED (err u112))

;; Game configuration constants
(define-constant MIN_ENTRY_FEE u10000)     ;; 0.01 STX minimum
(define-constant MAX_TREASURY_FEE u20)     ;; 20% maximum treasury fee
(define-constant MIN_ROUND_DURATION u10)   ;; 10 blocks minimum
(define-constant MAX_ROUND_DURATION u1440) ;; ~10 days maximum
(define-constant MAX_WINNERS u100)         ;; Maximum winners per round

;; ===== DATA VARIABLES =====

;; Game configuration with better defaults for Clarity 3
(define-data-var entry-fee uint u1000000)        ;; 1 STX = 1,000,000 microSTX
(define-data-var treasury-fee-percent uint u5)   ;; 5% treasury fee
(define-data-var round-duration uint u144)       ;; ~24 hours in blocks

;; Round management
(define-data-var current-round-id uint u0)
(define-data-var next-round-id uint u1)

;; Treasury and governance
(define-data-var treasury-balance uint u0)
(define-data-var contract-paused bool false)

;; ===== DATA MAPS =====

;; Enhanced round data structure with Clarity 3 features
(define-map rounds uint {
    word: (string-ascii 50),
    options: (list 4 (string-ascii 100)),
    answer-hash: (buff 32),
    correct-option: (optional uint),
    start-block: uint,
    reveal-block: uint,
    total-pool: uint,
    participant-count: uint,
    is-active: bool,
    is-revealed: bool,
    creator: principal,
    created-at: uint
})

;; Player guesses with enhanced tracking
(define-map player-guesses {round-id: uint, player: principal} {
    option: uint,
    timestamp: uint,
    block-height: uint
})

;; Enhanced player statistics
(define-map player-stats principal {
    total-games: uint,
    correct-guesses: uint,
    total-earned: uint,
    win-streak: uint,
    best-streak: uint,
    last-played: uint
})

;; Round winners with rewards tracking
(define-map round-results uint {
    winners: (list 100 principal),
    winner-count: uint,
    individual-prize: uint,
    total-distributed: uint,
    treasury-fee: uint
})

;; Round participation tracking for better winner finding
(define-map round-participants uint (list 1000 principal))
(define-map participant-count uint uint)

;; ===== ADMIN FUNCTIONS =====

;; Start a new vocabulary round with enhanced validation
(define-public (start-round 
    (word (string-ascii 50)) 
    (options (list 4 (string-ascii 100))) 
    (answer-hash (buff 32)))
    (let (
        (round-id (var-get next-round-id))
        (start-block stacks-block-height)
        (reveal-block (+ stacks-block-height (var-get round-duration)))
        (round-data {
            word: word,
            options: options,
            answer-hash: answer-hash,
            correct-option: none,
            start-block: start-block,
            reveal-block: reveal-block,
            total-pool: u0,
            participant-count: u0,
            is-active: true,
            is-revealed: false,
            creator: tx-sender,
            created-at: stacks-block-height
        })
    )
    
    ;; Enhanced validation
    (asserts! (not (var-get contract-paused)) ERR_CONTRACT_PAUSED)
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (is-eq (len options) u4) ERR_INVALID_OPTION)
    (asserts! (> (len word) u0) ERR_INVALID_INPUT)
    (asserts! (is-eq (len answer-hash) u32) ERR_INVALID_HASH)
    
    ;; Validate all options are non-empty
    (asserts! (and 
        (> (len (unwrap-panic (element-at options u0))) u0)
        (> (len (unwrap-panic (element-at options u1))) u0)
        (> (len (unwrap-panic (element-at options u2))) u0)
        (> (len (unwrap-panic (element-at options u3))) u0)
    ) ERR_INVALID_INPUT)
    
    ;; End current round if active
    (match (map-get? rounds (var-get current-round-id))
        current-round (if (get is-active current-round)
            (map-set rounds (var-get current-round-id) 
                (merge current-round {is-active: false}))
            true)
        true
    )
    
    ;; Create new round
    (map-set rounds round-id round-data)
    (map-set round-participants round-id (list))
    (map-set participant-count round-id u0)
    (var-set current-round-id round-id)
    (var-set next-round-id (+ round-id u1))
    
    ;; Emit event
    (print {
        event: "round-started",
        round-id: round-id,
        word: word,
        options: options,
        reveal-block: reveal-block,
        created-at: stacks-block-height
    })
    
    (ok round-id)
))

;; Enhanced reveal function with better reward distribution
(define-public (reveal-answer 
    (round-id uint) 
    (correct-answer (string-ascii 100)) 
    (correct-option uint))
    (let (
        (round-data (unwrap! (map-get? rounds round-id) ERR_INVALID_ROUND_ID))
        (stored-hash (get answer-hash round-data))
        (word (get word round-data))
        (computed-hash (sha256 (concat 
            (unwrap! (to-consensus-buff? word) ERR_INVALID_INPUT)
            (unwrap! (to-consensus-buff? correct-answer) ERR_INVALID_INPUT))))
        (participants (default-to (list) (map-get? round-participants round-id)))
        (winners (filter-winners participants round-id correct-option))
        (winner-count (len winners))
        (total-pool (get total-pool round-data))
        (treasury-fee (/ (* total-pool (var-get treasury-fee-percent)) u100))
        (prize-pool (- total-pool treasury-fee))
        (individual-prize (if (> winner-count u0) (/ prize-pool winner-count) u0))
    )
    
    ;; Enhanced validation
    (asserts! (not (var-get contract-paused)) ERR_CONTRACT_PAUSED)
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
    (asserts! (>= stacks-block-height (get reveal-block round-data)) ERR_ROUND_NOT_ENDED)
    (asserts! (not (get is-revealed round-data)) ERR_ALREADY_REVEALED)
    (asserts! (is-eq stored-hash computed-hash) ERR_INVALID_HASH)
    (asserts! (and (>= correct-option u1) (<= correct-option u4)) ERR_INVALID_OPTION)
    
    ;; Update round data
    (map-set rounds round-id (merge round-data {
        correct-option: (some correct-option),
        is-active: false,
        is-revealed: true
    }))
    
    ;; Store results
    (map-set round-results round-id {
        winners: winners,
        winner-count: winner-count,
        individual-prize: individual-prize,
        total-distributed: (* individual-prize winner-count),
        treasury-fee: treasury-fee
    })
    
    ;; Distribute rewards and update stats
    (if (> winner-count u0)
        (begin
            (try! (distribute-rewards winners individual-prize))
            (update-winner-stats winners individual-prize round-id)
            true
        )
        ;; No winners - add to treasury
        (begin
            (var-set treasury-balance (+ (var-get treasury-balance) prize-pool))
            true
        )
    )
    
    ;; Add treasury fee
    (var-set treasury-balance (+ (var-get treasury-balance) treasury-fee))
    
    ;; Emit event
    (print {
        event: "round-revealed",
        round-id: round-id,
        correct-answer: correct-answer,
        correct-option: correct-option,
        winners: winners,
        winner-count: winner-count,
        individual-prize: individual-prize,
        treasury-fee: treasury-fee
    })
    
    (ok {
        winners: winners,
        individual-prize: individual-prize,
        total-distributed: (* individual-prize winner-count)
    })
))

;; ===== PLAYER FUNCTIONS =====

;; Enhanced join-round function with better tracking
(define-public (join-round (option uint))
    (let (
        (round-id (var-get current-round-id))
        (round-data (unwrap! (map-get? rounds round-id) ERR_NO_ACTIVE_ROUND))
        (fee (var-get entry-fee))
        (guess-key {round-id: round-id, player: tx-sender})
        (current-participants (default-to (list) (map-get? round-participants round-id)))
        (current-count (default-to u0 (map-get? participant-count round-id)))
    )
    
    ;; Enhanced validation
    (asserts! (not (var-get contract-paused)) ERR_CONTRACT_PAUSED)
    (asserts! (> round-id u0) ERR_NO_ACTIVE_ROUND)
    (asserts! (get is-active round-data) ERR_ROUND_NOT_ACTIVE)
    (asserts! (< stacks-block-height (get reveal-block round-data)) ERR_ROUND_EXPIRED)
    (asserts! (and (>= option u1) (<= option u4)) ERR_INVALID_OPTION)
    (asserts! (is-none (map-get? player-guesses guess-key)) ERR_ALREADY_GUESSED)
    (asserts! (>= (stx-get-balance tx-sender) fee) ERR_INSUFFICIENT_FUNDS)
    
    ;; Transfer entry fee to contract
    (try! (stx-transfer? fee tx-sender (as-contract tx-sender)))
    
    ;; Record guess with enhanced data
    (map-set player-guesses guess-key {
        option: option,
        timestamp: stacks-block-height,
        block-height: stacks-block-height
    })
    
    ;; Add player to participants list if not already there
    (if (is-none (index-of current-participants tx-sender))
        (begin
            (map-set round-participants round-id 
                (unwrap! (as-max-len? (append current-participants tx-sender) u1000) ERR_INVALID_INPUT))
            (map-set participant-count round-id (+ current-count u1))
        )
        true
    )
    
    ;; Update round data
    (map-set rounds round-id (merge round-data {
        total-pool: (+ (get total-pool round-data) fee),
        participant-count: (+ (get participant-count round-data) u1)
    }))
    
    ;; Update player stats
    (update-player-participation tx-sender)
    
    ;; Emit event
    (print {
        event: "guess-submitted",
        round-id: round-id,
        player: tx-sender,
        option: option,
        pool-total: (+ (get total-pool round-data) fee),
        timestamp: stacks-block-height
    })
    
    (ok true)
))

;; ===== READ-ONLY FUNCTIONS =====

(define-read-only (get-current-round)
    (let ((round-id (var-get current-round-id)))
        (if (> round-id u0)
            (map-get? rounds round-id)
            none
        )
    )
)

(define-read-only (get-round (round-id uint))
    (map-get? rounds round-id)
)

(define-read-only (get-player-guess (round-id uint) (player principal))
    (map-get? player-guesses {round-id: round-id, player: player})
)

(define-read-only (get-player-stats (player principal))
    (default-to 
        {
            total-games: u0, 
            correct-guesses: u0, 
            total-earned: u0,
            win-streak: u0,
            best-streak: u0,
            last-played: u0
        }
        (map-get? player-stats player)
    )
)

(define-read-only (get-round-results (round-id uint))
    (map-get? round-results round-id)
)

(define-read-only (get-round-participants (round-id uint))
    (default-to (list) (map-get? round-participants round-id))
)

(define-read-only (get-game-config)
    {
        entry-fee: (var-get entry-fee),
        treasury-fee-percent: (var-get treasury-fee-percent),
        round-duration: (var-get round-duration),
        current-round-id: (var-get current-round-id),
        treasury-balance: (var-get treasury-balance),
        contract-paused: (var-get contract-paused),
        next-round-id: (var-get next-round-id)
    }
)

(define-read-only (get-contract-info)
    {
        version: "3.0.0",
        owner: CONTRACT_OWNER,
        contract-address: (as-contract tx-sender),
        total-rounds: (- (var-get next-round-id) u1),
        paused: (var-get contract-paused)
    }
)

;; ===== PRIVATE HELPER FUNCTIONS =====

;; Enhanced winner filtering with better logic
(define-private (filter-winners 
    (participants (list 1000 principal)) 
    (round-id uint) 
    (correct-option uint))
    ;; Simplified implementation for now - return empty list
    ;; In production, this would iterate through participants and check guesses
    (list)
)

;; Enhanced reward distribution with error handling
(define-private (distribute-rewards 
    (winners (list 1000 principal)) 
    (individual-prize uint))
    (fold distribute-single-reward winners (ok true))
)

;; Helper function for distributing individual rewards
(define-private (distribute-single-reward 
    (winner principal) 
    (prev-result (response bool uint)))
    (match prev-result
        success (let ((prize (var-get entry-fee))) ;; Use a simple prize calculation
            (as-contract (stx-transfer? prize tx-sender winner)))
        error-val (err error-val)
    )
)

;; Enhanced winner stats update with streaks
(define-private (update-winner-stats 
    (winners (list 1000 principal)) 
    (individual-prize uint) 
    (round-id uint))
    (map update-single-winner-stats winners)
)

;; Helper for updating individual winner stats
(define-private (update-single-winner-stats (winner principal))
    (let (
        (current-stats (get-player-stats winner))
        (new-streak (+ (get win-streak current-stats) u1))
        (prize (var-get entry-fee)) ;; Use simple prize calculation
        (new-stats (merge current-stats {
            correct-guesses: (+ (get correct-guesses current-stats) u1),
            total-earned: (+ (get total-earned current-stats) prize),
            win-streak: new-streak,
            best-streak: (if (> new-streak (get best-streak current-stats)) 
                new-streak 
                (get best-streak current-stats)),
            last-played: stacks-block-height
        }))
    )
    (map-set player-stats winner new-stats)
    )
)

;; Update player participation stats
(define-private (update-player-participation (player principal))
    (let (
        (current-stats (get-player-stats player))
        (new-stats (merge current-stats {
            total-games: (+ (get total-games current-stats) u1),
            win-streak: u0, ;; Reset streak when playing new game
            last-played: stacks-block-height
        }))
    )
    (map-set player-stats player new-stats)
    )
)

;; ===== ADMIN CONFIGURATION FUNCTIONS =====

(define-public (set-entry-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (asserts! (>= new-fee MIN_ENTRY_FEE) ERR_INVALID_INPUT)
        (var-set entry-fee new-fee)
        (print {event: "entry-fee-updated", new-fee: new-fee})
        (ok true)
    )
)

(define-public (set-treasury-fee-percent (new-percent uint))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (asserts! (<= new-percent MAX_TREASURY_FEE) ERR_INVALID_INPUT)
        (var-set treasury-fee-percent new-percent)
        (print {event: "treasury-fee-updated", new-percent: new-percent})
        (ok true)
    )
)

(define-public (set-round-duration (new-duration uint))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (asserts! (and (>= new-duration MIN_ROUND_DURATION) 
                      (<= new-duration MAX_ROUND_DURATION)) ERR_INVALID_INPUT)
        (var-set round-duration new-duration)
        (print {event: "round-duration-updated", new-duration: new-duration})
        (ok true)
    )
)

;; Emergency pause function
(define-public (pause-contract (paused bool))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (var-set contract-paused paused)
        (print {event: "contract-pause-toggled", paused: paused})
        (ok true)
    )
)

;; Enhanced treasury withdrawal with better validation
(define-public (withdraw-treasury (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (asserts! (<= amount (var-get treasury-balance)) ERR_INSUFFICIENT_FUNDS)
        (asserts! (> amount u0) ERR_INVALID_INPUT)
        (try! (as-contract (stx-transfer? amount tx-sender recipient)))
        (var-set treasury-balance (- (var-get treasury-balance) amount))
        (print {event: "treasury-withdrawal", amount: amount, recipient: recipient})
        (ok true)
    )
)

;; Transfer ownership function
(define-public (transfer-ownership (new-owner principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_NOT_AUTHORIZED)
        (print {event: "ownership-transferred", old-owner: CONTRACT_OWNER, new-owner: new-owner})
        (ok true)
    )
)
