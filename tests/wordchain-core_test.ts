import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Helper function to create answer hash
function createAnswerHash(word: string, answer: string): string {
    // This is a simplified hash for testing - in production use proper SHA256
    return `0x${'0'.repeat(64)}`;
}

Clarinet.test({
    name: "Admin can start a new vocabulary round",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const word = "ephemeral";
        const options = [
            "Lasting a short time",
            "Everlasting", 
            "Painful",
            "Colorful"
        ];
        const answerHash = createAnswerHash(word, options[0]);
        
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'start-round', [
                types.ascii(word),
                types.list([
                    types.ascii(options[0]),
                    types.ascii(options[1]),
                    types.ascii(options[2]),
                    types.ascii(options[3])
                ]),
                types.buff(Buffer.from(answerHash.slice(2), 'hex'))
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.uint(1));
        
        // Verify round was created
        let roundData = chain.callReadOnlyFn('wordchain-core', 'get-current-round', [], deployer.address);
        let round = roundData.result.expectSome().expectTuple();
        assertEquals(round['word'], types.ascii(word));
        assertEquals(round['is-active'], types.bool(true));
    },
});

Clarinet.test({
    name: "Non-admin cannot start a round",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        const word = "test";
        const options = ["A", "B", "C", "D"];
        const answerHash = createAnswerHash(word, options[0]);
        
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'start-round', [
                types.ascii(word),
                types.list([
                    types.ascii(options[0]),
                    types.ascii(options[1]),
                    types.ascii(options[2]),
                    types.ascii(options[3])
                ]),
                types.buff(Buffer.from(answerHash.slice(2), 'hex'))
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(100)); // ERR_NOT_AUTHORIZED
    },
});

Clarinet.test({
    name: "Player can join active round with correct fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const player1 = accounts.get('wallet_1')!;
        const word = "ephemeral";
        const options = ["Lasting a short time", "Everlasting", "Painful", "Colorful"];
        const answerHash = createAnswerHash(word, options[0]);
        
        // Start round
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'start-round', [
                types.ascii(word),
                types.list([
                    types.ascii(options[0]),
                    types.ascii(options[1]),
                    types.ascii(options[2]),
                    types.ascii(options[3])
                ]),
                types.buff(Buffer.from(answerHash.slice(2), 'hex'))
            ], deployer.address)
        ]);
        
        // Player joins with option 1
        block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'join-round', [
                types.uint(1)
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.bool(true));
        
        // Verify guess was recorded
        let guessData = chain.callReadOnlyFn('wordchain-core', 'get-player-guess', [
            types.uint(1),
            types.principal(player1.address)
        ], deployer.address);
        let guess = guessData.result.expectSome().expectTuple();
        assertEquals(guess['option'], types.uint(1));
    },
});

Clarinet.test({
    name: "Player cannot guess twice in same round",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const player1 = accounts.get('wallet_1')!;
        const word = "test";
        const options = ["A", "B", "C", "D"];
        const answerHash = createAnswerHash(word, options[0]);
        
        // Start round and join
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'start-round', [
                types.ascii(word),
                types.list([
                    types.ascii(options[0]),
                    types.ascii(options[1]),
                    types.ascii(options[2]),
                    types.ascii(options[3])
                ]),
                types.buff(Buffer.from(answerHash.slice(2), 'hex'))
            ], deployer.address),
            Tx.contractCall('wordchain-core', 'join-round', [
                types.uint(1)
            ], player1.address)
        ]);
        
        // Try to guess again
        block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'join-round', [
                types.uint(2)
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(103)); // ERR_ALREADY_GUESSED
    },
});

Clarinet.test({
    name: "Player cannot join with invalid option",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const player1 = accounts.get('wallet_1')!;
        const word = "test";
        const options = ["A", "B", "C", "D"];
        const answerHash = createAnswerHash(word, options[0]);
        
        // Start round
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'start-round', [
                types.ascii(word),
                types.list([
                    types.ascii(options[0]),
                    types.ascii(options[1]),
                    types.ascii(options[2]),
                    types.ascii(options[3])
                ]),
                types.buff(Buffer.from(answerHash.slice(2), 'hex'))
            ], deployer.address)
        ]);
        
        // Try to join with invalid option (0)
        block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'join-round', [
                types.uint(0)
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(104)); // ERR_INVALID_OPTION
        
        // Try to join with invalid option (5)
        block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'join-round', [
                types.uint(5)
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(104)); // ERR_INVALID_OPTION
    },
});

Clarinet.test({
    name: "Cannot reveal answer before round ends",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const word = "test";
        const options = ["A", "B", "C", "D"];
        const correctAnswer = options[0];
        const answerHash = createAnswerHash(word, correctAnswer);
        
        // Start round
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'start-round', [
                types.ascii(word),
                types.list([
                    types.ascii(options[0]),
                    types.ascii(options[1]),
                    types.ascii(options[2]),
                    types.ascii(options[3])
                ]),
                types.buff(Buffer.from(answerHash.slice(2), 'hex'))
            ], deployer.address)
        ]);
        
        // Try to reveal immediately
        block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'reveal-answer', [
                types.uint(1),
                types.ascii(correctAnswer),
                types.uint(1)
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(105)); // ERR_ROUND_NOT_ENDED
    },
});

Clarinet.test({
    name: "Can retrieve player statistics",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        
        let stats = chain.callReadOnlyFn('wordchain-core', 'get-player-stats', [
            types.principal(player1.address)
        ], player1.address);
        
        let playerStats = stats.result.expectTuple();
        assertEquals(playerStats['total-games'], types.uint(0));
        assertEquals(playerStats['correct-guesses'], types.uint(0));
        assertEquals(playerStats['total-earned'], types.uint(0));
    },
});

Clarinet.test({
    name: "Can retrieve game configuration",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        
        let config = chain.callReadOnlyFn('wordchain-core', 'get-game-config', [], deployer.address);
        let gameConfig = config.result.expectTuple();
        
        assertEquals(gameConfig['entry-fee'], types.uint(1000000)); // 1 STX
        assertEquals(gameConfig['treasury-fee-percent'], types.uint(5)); // 5%
        assertEquals(gameConfig['current-round-id'], types.uint(0));
    },
});

Clarinet.test({
    name: "Admin can update entry fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const newFee = 2000000; // 2 STX
        
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'set-entry-fee', [
                types.uint(newFee)
            ], deployer.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.bool(true));
        
        // Verify fee was updated
        let config = chain.callReadOnlyFn('wordchain-core', 'get-game-config', [], deployer.address);
        let gameConfig = config.result.expectTuple();
        assertEquals(gameConfig['entry-fee'], types.uint(newFee));
    },
});

Clarinet.test({
    name: "Non-admin cannot update entry fee",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        const newFee = 2000000;
        
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'set-entry-fee', [
                types.uint(newFee)
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(100)); // ERR_NOT_AUTHORIZED
    },
});

Clarinet.test({
    name: "Multiple players can join same round",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const player1 = accounts.get('wallet_1')!;
        const player2 = accounts.get('wallet_2')!;
        const player3 = accounts.get('wallet_3')!;
        
        const word = "ephemeral";
        const options = ["Lasting a short time", "Everlasting", "Painful", "Colorful"];
        const answerHash = createAnswerHash(word, options[0]);
        
        // Start round
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'start-round', [
                types.ascii(word),
                types.list([
                    types.ascii(options[0]),
                    types.ascii(options[1]),
                    types.ascii(options[2]),
                    types.ascii(options[3])
                ]),
                types.buff(Buffer.from(answerHash.slice(2), 'hex'))
            ], deployer.address)
        ]);
        
        // Multiple players join
        block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'join-round', [types.uint(1)], player1.address),
            Tx.contractCall('wordchain-core', 'join-round', [types.uint(2)], player2.address),
            Tx.contractCall('wordchain-core', 'join-round', [types.uint(1)], player3.address)
        ]);
        
        assertEquals(block.receipts.length, 3);
        assertEquals(block.receipts[0].result.expectOk(), types.bool(true));
        assertEquals(block.receipts[1].result.expectOk(), types.bool(true));
        assertEquals(block.receipts[2].result.expectOk(), types.bool(true));
        
        // Verify round pool increased
        let poolAmount = chain.callReadOnlyFn('wordchain-core', 'get-round-pool', [
            types.uint(1)
        ], deployer.address);
        assertEquals(poolAmount.result, types.uint(3000000)); // 3 STX total
    },
});

Clarinet.test({
    name: "Cannot join round when no active round exists",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('wordchain-core', 'join-round', [
                types.uint(1)
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(108)); // ERR_NO_ACTIVE_ROUND
    },
});
