import { Clarinet, Tx, Chain, Account, types } from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
    name: "Can create a new game with valid parameters",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const deployer = accounts.get('deployer')!;
        const player1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'create-game', [
                types.uint(1000000), // 1 STX bet
                types.uint(4),       // Center position
                types.uint(1)        // X move
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.uint(0));
    },
});

Clarinet.test({
    name: "Cannot create game with zero bet amount",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'create-game', [
                types.uint(0),       // 0 STX bet (invalid)
                types.uint(4),       // Center position
                types.uint(1)        // X move
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(100));
    },
});

Clarinet.test({
    name: "Cannot create game with O move (must be X)",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'create-game', [
                types.uint(1000000), // 1 STX bet
                types.uint(4),       // Center position
                types.uint(2)        // O move (invalid for game creation)
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(101));
    },
});

Clarinet.test({
    name: "Can join an existing game",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        const player2 = accounts.get('wallet_2')!;
        
        // Create game
        let block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'create-game', [
                types.uint(1000000), // 1 STX bet
                types.uint(4),       // Center position
                types.uint(1)        // X move
            ], player1.address)
        ]);
        
        // Join game
        block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'join-game', [
                types.uint(0),       // Game ID 0
                types.uint(0),       // Top-left position
                types.uint(2)        // O move
            ], player2.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.uint(0));
    },
});

Clarinet.test({
    name: "Cannot join game that doesn't exist",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player2 = accounts.get('wallet_2')!;
        
        let block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'join-game', [
                types.uint(999),     // Non-existent game ID
                types.uint(0),       // Top-left position
                types.uint(2)        // O move
            ], player2.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(102));
    },
});

Clarinet.test({
    name: "Can play a complete game and determine winner",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        const player2 = accounts.get('wallet_2')!;
        
        // Create game - Player 1 plays center (X)
        let block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'create-game', [
                types.uint(1000000), // 1 STX bet
                types.uint(4),       // Center position
                types.uint(1)        // X move
            ], player1.address)
        ]);
        
        // Join game - Player 2 plays top-left (O)
        block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'join-game', [
                types.uint(0),       // Game ID 0
                types.uint(0),       // Top-left position
                types.uint(2)        // O move
            ], player2.address)
        ]);
        
        // Player 1 plays top-right (X)
        block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'play', [
                types.uint(0),       // Game ID 0
                types.uint(2),       // Top-right position
                types.uint(1)        // X move
            ], player1.address)
        ]);
        
        // Player 2 plays bottom-left (O)
        block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'play', [
                types.uint(0),       // Game ID 0
                types.uint(6),       // Bottom-left position
                types.uint(2)        // O move
            ], player2.address)
        ]);
        
        // Player 1 plays bottom-right (X) - should win with diagonal
        block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'play', [
                types.uint(0),       // Game ID 0
                types.uint(8),       // Bottom-right position
                types.uint(1)        // X move
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectOk(), types.uint(0));
        
        // Check game state to verify winner
        let gameState = chain.callReadOnlyFn('tic-tac-toe', 'get-game', [types.uint(0)], player1.address);
        let game = gameState.result.expectSome().expectTuple();
        assertEquals(game['winner'].expectSome(), player1.address);
    },
});

Clarinet.test({
    name: "Cannot play out of turn",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        const player2 = accounts.get('wallet_2')!;
        
        // Create and join game
        let block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'create-game', [
                types.uint(1000000), types.uint(4), types.uint(1)
            ], player1.address),
            Tx.contractCall('tic-tac-toe', 'join-game', [
                types.uint(0), types.uint(0), types.uint(2)
            ], player2.address)
        ]);
        
        // Try to play as player 2 when it's player 1's turn
        block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'play', [
                types.uint(0), types.uint(1), types.uint(2)
            ], player2.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(104));
    },
});

Clarinet.test({
    name: "Cannot play on occupied cell",
    async fn(chain: Chain, accounts: Map<string, Account>) {
        const player1 = accounts.get('wallet_1')!;
        const player2 = accounts.get('wallet_2')!;
        
        // Create and join game
        let block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'create-game', [
                types.uint(1000000), types.uint(4), types.uint(1)
            ], player1.address),
            Tx.contractCall('tic-tac-toe', 'join-game', [
                types.uint(0), types.uint(0), types.uint(2)
            ], player2.address)
        ]);
        
        // Try to play on already occupied center cell
        block = chain.mineBlock([
            Tx.contractCall('tic-tac-toe', 'play', [
                types.uint(0), types.uint(4), types.uint(1) // Center is already occupied
            ], player1.address)
        ]);
        
        assertEquals(block.receipts.length, 1);
        assertEquals(block.receipts[0].result.expectErr(), types.uint(101));
    },
});
