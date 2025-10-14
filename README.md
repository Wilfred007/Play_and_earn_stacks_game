# 🧠 WordChain: On-Chain Vocabulary Challenge

An educative learn-to-earn game built on the Stacks blockchain using Clarity smart contracts. Players learn new words and meanings while earning STX rewards through vocabulary challenges.

## 🎯 Game Features

- **Learn-to-Earn**: Players earn STX by correctly guessing word meanings
- **Vocabulary Challenges**: Multiple-choice questions with 4 possible answers
- **Shared Prize Pool**: All entry fees form a pool distributed among winners
- **Commit-Reveal Fairness**: Cryptographic hash prevents answer manipulation
- **Leaderboard System**: Track player performance across multiple rounds
- **Community Governance**: Future DAO integration for word selection

## 📋 Game Rules

1. **Round Creation**: Admin starts a round with a word and 4 possible meanings
2. **Entry Fee**: Players pay 1 STX to join and submit their guess
3. **Guess Period**: Players have ~24 hours to submit their answers
4. **Answer Reveal**: Admin reveals the correct answer using cryptographic proof
5. **Prize Distribution**: Correct players share the STX pool equally
6. **Scoring**: Players earn points and STX for correct answers

## 🔧 Contract Functions

### Admin Functions

#### `start-round`
```clarity
(start-round (word (string-ascii 50)) (options (list 4 (string-ascii 100))) (answer-hash (buff 32)))
```
- Creates a new vocabulary round
- Stores cryptographic hash of correct answer
- Returns round ID

#### `reveal-answer`
```clarity
(reveal-answer (round-id uint) (correct-answer (string-ascii 100)) (correct-option uint))
```
- Reveals correct answer after round ends
- Validates against stored hash
- Distributes prizes to winners

### Player Functions

#### `join-round`
```clarity
(join-round (option uint))
```
- Join current active round with entry fee
- Submit guess (1-4 for multiple choice)
- Can only guess once per round

### Read-Only Functions

#### `get-current-round`
```clarity
(get-current-round)
```
- Returns current active round data

#### `get-player-stats`
```clarity
(get-player-stats (player principal))
```
- Returns player's game statistics and earnings

#### `get-round-winners`
```clarity
(get-round-winners (round-id uint))
```
- Returns list of winners for a specific round

## 🎯 Round Structure

Each vocabulary round contains:

```clarity
{
    word: "Ephemeral",
    options: [
        "Lasting a short time",     ;; Option 1 (Correct)
        "Everlasting",              ;; Option 2
        "Painful",                  ;; Option 3
        "Colorful"                  ;; Option 4
    ],
    answer-hash: 0x...,            ;; SHA256 hash for fairness
    reveal-block: 12345,           ;; When answers can be revealed
    total-pool: 1000000,           ;; Total STX in prize pool
    is-active: true                ;; Round status
}
```

## ⚠️ Error Codes

- `u100` (ERR_NOT_AUTHORIZED): Only admin can perform this action
- `u101` (ERR_INSUFFICIENT_FUNDS): Player doesn't have enough STX
- `u102` (ERR_ROUND_NOT_ACTIVE): Round is not currently accepting guesses
- `u103` (ERR_ALREADY_GUESSED): Player has already submitted a guess
- `u104` (ERR_INVALID_OPTION): Invalid answer option (must be 1-4)
- `u105` (ERR_ROUND_NOT_ENDED): Cannot reveal answer before round ends
- `u106` (ERR_ALREADY_REVEALED): Answer has already been revealed
- `u107` (ERR_INVALID_HASH): Provided answer doesn't match stored hash
- `u108` (ERR_NO_ACTIVE_ROUND): No round is currently active

## 🚀 Deployment

1. Deploy the WordChain contract to Stacks blockchain
2. Admin can start vocabulary rounds immediately
3. Players join rounds through Stacks wallets
4. Educational content can be integrated via frontend

## 🔍 Player Statistics Structure

```clarity
{
    total-games: uint,      ;; Number of rounds participated
    correct-guesses: uint,  ;; Number of correct answers
    total-earned: uint      ;; Total STX earned from prizes
}
```

## 💰 Tokenomics

| Parameter | Value | Description |
|-----------|-------|-------------|
| Entry Fee | 1 STX | Cost to join each round |
| Treasury Fee | 5% | Platform sustainability fee |
| Prize Pool | 95% of entries | Distributed among winners |
| Round Duration | ~24 hours | Time to submit guesses |

## 💡 Usage Example

**Round: "Ephemeral"**
1. **Start Round**: Admin creates round with word "Ephemeral" and 4 options
2. **Players Join**: 10 players each pay 1 STX and submit guesses
3. **Prize Pool**: 10 STX total (9.5 STX for winners, 0.5 STX treasury)
4. **Reveal**: Admin reveals correct answer is "Lasting a short time"
5. **Winners**: 3 players guessed correctly
6. **Prize**: Each winner receives 3.17 STX (9.5 ÷ 3)

## 🛡️ Security Features

- **Commit-Reveal Scheme**: Cryptographic hash prevents answer manipulation
- **Access Control**: Only authorized admin can start rounds and reveal answers
- **Input Validation**: Comprehensive validation for all player actions
- **Automatic Distribution**: Trustless prize distribution to winners
- **Treasury Management**: Transparent fee collection and governance

## 🎓 Educational Benefits

- **Vocabulary Expansion**: Learn new words through gamified challenges
- **Financial Incentive**: Earn STX rewards for correct answers
- **Blockchain Literacy**: Experience DeFi and smart contracts firsthand
- **Community Learning**: Participate in decentralized education ecosystem
# Play_and_earn_stacks_game
