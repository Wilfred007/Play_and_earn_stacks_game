;; WordChain: On-Chain Vocabulary Challenge
;; An Educative Learn-to-Earn Game Built on the Stacks Blockchain

(define-constant CONTRACT_OWNER tx-sender)
(define-constant THIS_CONTRACT (as-contract tx-sender))

;; Error constants
(define-constant ERR_NOT_AUTHORIZED u100)
(define-constant ERR_INSUFFICIENT_FUNDS u101)
(define-constant ERR_ROUND_NOT_ACTIVE u102)
(define-constant ERR_ALREADY_GUESSED u103)
(define-constant ERR_INVALID_OPTION u104)
(define-constant ERR_ROUND_NOT_ENDED u105)
(define-constant ERR_ALREADY_REVEALED u106)
(define-constant ERR_INVALID_HASH u107)
(define-constant ERR_NO_ACTIVE_ROUND u108)

;; Game configuration
(define-data-var entry-fee uint u100000) ;; 0.1 STX = 100,000 microSTX
(define-data-var treasury-fee-percent uint u5) ;; 5% treasury fee
(define-data-var round-duration uint u144) ;; ~24 hours in blocks 

;; Round management
(define-data-var current-round-id uint u0)
(define-data-var next-round-id uint u1)

;; Round data structure
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
    creator: principal
})


;; Player guesses for each round
(define-map guesses {round-id: uint, player: principal} {
    option: uint,
    timestamp: uint
})

;; Round prize pools
(define-map round-pools uint uint)

;; Player statistics
(define-map player-scores principal {
    total-games: uint,
    correct-guesses: uint,
    total-earned: uint
})

;; Treasury balance
(define-data-var treasury-balance uint u0)

;; Round winners tracking
(define-map round-winners uint (list 100 principal))

;; ===== ADMIN FUNCTIONS =====

;; Start a new vocabulary round
(define-public (start-round 
    (word (string-ascii 50)) 
    (options (list 4 (string-ascii 100))) 
    (answer-hash (buff 32)))
    (let (
        (round-id (var-get next-round-id))
        (start-block block-height)
        (reveal-block (+ block-height (var-get round-duration)))
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
            creator: tx-sender
        })
    )
    
    ;; Only contract owner can start rounds
    (asserts! (is-eq tx-sender CONTRACT_OWNER) (err ERR_NOT_AUTHORIZED))
    ;; Ensure options list has exactly 4 items
    (asserts! (is-eq (len options) u4) (err ERR_INVALID_OPTION))
    
    ;; End current round if active
    (if (> (var-get current-round-id) u0)
        (var-set current-round-id u0)
        true
    )
    
    ;; Create new round
    (map-set rounds round-id round-data)
    (map-set round-pools round-id u0)
    (var-set current-round-id round-id)
    (var-set next-round-id (+ round-id u1))
    
    (print {
        action: "round-started",
        round-id: round-id,
        word: word,
        options: options,
        reveal-block: reveal-block
    })
    
    (ok round-id)
))

;; Reveal the correct answer and distribute rewards
(define-public (reveal-answer (round-id uint) (correct-answer (string-ascii 100)) (correct-option uint))
    (let (
        (round-data (unwrap! (map-get? rounds round-id) (err ERR_NO_ACTIVE_ROUND)))
        (stored-hash (get answer-hash round-data))
        (word (get word round-data))
        (computed-hash (sha256 (concat (unwrap-panic (to-consensus-buff? word)) (unwrap-panic (to-consensus-buff? correct-answer)))))
        (total-pool (unwrap! (map-get? round-pools round-id) (err ERR_NO_ACTIVE_ROUND)))
        (winners (find-round-winners round-id correct-option))
        (winner-count (len winners))
        (treasury-fee (/ (* total-pool (var-get treasury-fee-percent)) u100))
        (prize-pool (- total-pool treasury-fee))
        (individual-prize (if (> winner-count u0) (/ prize-pool winner-count) u0))
    )
    
    ;; Validate reveal conditions
    (asserts! (is-eq tx-sender CONTRACT_OWNER) (err ERR_NOT_AUTHORIZED))
    (asserts! (>= block-height (get reveal-block round-data)) (err ERR_ROUND_NOT_ENDED))
    (asserts! (not (get is-revealed round-data)) (err ERR_ALREADY_REVEALED))
    (asserts! (is-eq stored-hash computed-hash) (err ERR_INVALID_HASH))
    (asserts! (and (>= correct-option u1) (<= correct-option u4)) (err ERR_INVALID_OPTION))
    
    ;; Update round data
    (map-set rounds round-id (merge round-data {
        correct-option: (some correct-option),
        is-active: false,
        is-revealed: true
    }))
    
    ;; Store winners
    (map-set round-winners round-id winners)
    
    ;; Distribute rewards to winners
    (if (> winner-count u0)
        (begin
            (distribute-rewards winners individual-prize)
            (update-winner-stats winners individual-prize)
        )
        ;; No winners - pool rolls over to treasury
        (var-set treasury-balance (+ (var-get treasury-balance) prize-pool))
    )
    
    ;; Add treasury fee
    (var-set treasury-balance (+ (var-get treasury-balance) treasury-fee))
    
    (print {
        action: "round-revealed",
        round-id: round-id,
        correct-answer: correct-answer,
        correct-option: correct-option,
        winners: winners,
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

;; Join a round by submitting a guess
(define-public (join-round (option uint))
    (let (
        (round-id (var-get current-round-id))
        (round-data (unwrap! (map-get? rounds round-id) (err ERR_NO_ACTIVE_ROUND)))
        (current-pool (unwrap! (map-get? round-pools round-id) (err ERR_NO_ACTIVE_ROUND)))
        (fee (var-get entry-fee))
        (guess-key {round-id: round-id, player: tx-sender})
        (guess-data {option: option, timestamp: block-height})
    )
    
    ;; Validate join conditions
    (asserts! (> round-id u0) (err ERR_NO_ACTIVE_ROUND))
    (asserts! (get is-active round-data) (err ERR_ROUND_NOT_ACTIVE))
    (asserts! (< block-height (get reveal-block round-data)) (err ERR_ROUND_NOT_ACTIVE))
    (asserts! (and (>= option u1) (<= option u4)) (err ERR_INVALID_OPTION))
    (asserts! (is-none (map-get? guesses guess-key)) (err ERR_ALREADY_GUESSED))
    (asserts! (>= (stx-get-balance tx-sender) fee) (err ERR_INSUFFICIENT_FUNDS))
    
    ;; Transfer entry fee to contract
    (try! (stx-transfer? fee tx-sender THIS_CONTRACT))
    
    ;; Record guess
    (map-set guesses guess-key guess-data)
    
    ;; Update pool and participant count
    (map-set round-pools round-id (+ current-pool fee))
    (map-set rounds round-id (merge round-data {
        total-pool: (+ current-pool fee),
        participant-count: (+ (get participant-count round-data) u1)
    }))
    
    ;; Update player stats
    (update-player-participation tx-sender)
    
    (print {
        action: "guess-submitted",
        round-id: round-id,
        player: tx-sender,
        option: option,
        pool-total: (+ current-pool fee)
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
    (map-get? guesses {round-id: round-id, player: player})
)

(define-read-only (get-player-stats (player principal))
    (default-to 
        {total-games: u0, correct-guesses: u0, total-earned: u0}
        (map-get? player-scores player)
    )
)

(define-read-only (get-round-pool (round-id uint))
    (default-to u0 (map-get? round-pools round-id))
)

(define-read-only (get-round-winners (round-id uint))
    (default-to (list) (map-get? round-winners round-id))
)

(define-read-only (get-game-config)
    {
        entry-fee: (var-get entry-fee),
        treasury-fee-percent: (var-get treasury-fee-percent),
        round-duration: (var-get round-duration),
        current-round-id: (var-get current-round-id),
        treasury-balance: (var-get treasury-balance)
    }
)

;; ===== PRIVATE HELPER FUNCTIONS =====

;; Get all winners for a specific round and correct option
(define-private (find-round-winners (round-id uint) (correct-option uint))
    ;; Simplified implementation - returns empty list for now
    ;; In production, this would iterate through all participants and check their guesses
    (list)
)

;; Check if a player's guess is correct
(define-private (is-correct-guess (round-id uint) (player principal) (correct-option uint))
    (match (map-get? guesses {round-id: round-id, player: player})
        guess-data (is-eq (get option guess-data) correct-option)
        false
    )
)

;; Get all participants for a round (simplified - in production, use events or indexing)
(define-private (get-round-participants (round-id uint))
    ;; This is a simplified implementation
    ;; In production, you'd track participants in a separate map or use events
    (list tx-sender) ;; Return a typed list of principals
)

;; Distribute rewards to winners - simplified implementation
(define-private (distribute-rewards (winners (list 100 principal)) (individual-prize uint))
    ;; Simplified: just return true for now
    ;; In production, would iterate through winners and transfer individual-prize to each
    true
)

;; Update winner statistics - simplified implementation  
(define-private (update-winner-stats (winners (list 100 principal)) (individual-prize uint))
    ;; Simplified: just return true for now
    ;; In production, would iterate through winners and update their stats
    true
)

;; Update player participation stats
(define-private (update-player-participation (player principal))
    (let (
        (current-stats (get-player-stats player))
        (new-stats (merge current-stats {
            total-games: (+ (get total-games current-stats) u1)
        }))
    )
    (map-set player-scores player new-stats)
    )
)

;; ===== ADMIN CONFIGURATION FUNCTIONS =====

(define-public (set-entry-fee (new-fee uint))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) (err ERR_NOT_AUTHORIZED))
        (var-set entry-fee new-fee)
        (ok true)
    )
)

(define-public (set-treasury-fee-percent (new-percent uint))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) (err ERR_NOT_AUTHORIZED))
        (asserts! (<= new-percent u20) (err ERR_INVALID_OPTION)) ;; Max 20%
        (var-set treasury-fee-percent new-percent)
        (ok true)
    )
)

(define-public (set-round-duration (new-duration uint))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) (err ERR_NOT_AUTHORIZED))
        (asserts! (>= new-duration u10) (err ERR_INVALID_OPTION)) ;; Min 10 blocks
        (var-set round-duration new-duration)
        (ok true)
    )
)

;; Withdraw treasury funds (for DAO governance in future)
(define-public (withdraw-treasury (amount uint) (recipient principal))
    (begin
        (asserts! (is-eq tx-sender CONTRACT_OWNER) (err ERR_NOT_AUTHORIZED))
        (asserts! (<= amount (var-get treasury-balance)) (err ERR_INSUFFICIENT_FUNDS))
        (try! (as-contract (stx-transfer? amount tx-sender recipient)))
        (var-set treasury-balance (- (var-get treasury-balance) amount))
        (ok true)
    )
)
