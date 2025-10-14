# WordChain Deployment Guide

## 📋 Prerequisites

1. **Clarinet CLI** - Install from [Clarinet Documentation](https://docs.hiro.so/clarinet)
2. **Stacks Wallet** - For testnet/mainnet deployment
3. **STX Tokens** - For deployment fees
4. **Node.js 18+** - For frontend development
5. **Yarn/NPM** - Package manager

## 🚀 Local Development

### Backend Setup
```bash
# Navigate to project
cd /home/wilfred/Projects/stacks/Guess_Stacks

# Check Clarinet installation
clarinet --version

# Check contract syntax
clarinet check
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
# or
yarn install

# Start development server
npm run dev
# or
yarn dev
```

### Testing
```bash
# Run all smart contract tests
clarinet test

# Run specific test
clarinet test --filter "Admin can start a new vocabulary round"

# Run WordChain specific tests
clarinet test tests/wordchain-core_test.ts
```

### Local Console
```bash
# Start Clarinet console
clarinet console

# Example WordChain interactions:
(contract-call? .wordchain-core start-round "ephemeral" (list "Lasting a short time" "Everlasting" "Painful" "Colorful") 0x1234567890abcdef1234567890abcdef12345678)
(contract-call? .wordchain-core join-round u1)
(contract-call? .wordchain-core get-current-round)
```

## 🌐 Testnet Deployment

### 1. Setup Testnet Account
```bash
# Generate new account or import existing
clarinet accounts new testnet-deployer

# Fund account with testnet STX
# Visit: https://explorer.stacks.co/sandbox/faucet
```

### 2. Deploy to Testnet
```bash
# Deploy contract
clarinet deploy --testnet

# Or deploy specific contract
clarinet deploy --testnet contracts/tic-tac-toe.clar
```

### 3. Verify Deployment
- Check deployment on [Stacks Explorer (Testnet)](https://explorer.stacks.co/?chain=testnet)
- Note contract address for frontend integration

## 🏭 Mainnet Deployment

### 1. Security Checklist
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Gas costs optimized
- [ ] Error handling comprehensive
- [ ] Documentation complete

### 2. Deploy to Mainnet
```bash
# Deploy with mainnet configuration
clarinet deploy --mainnet

# Confirm deployment details
# Double-check contract address
```

### 3. Post-Deployment
- Verify on [Stacks Explorer (Mainnet)](https://explorer.stacks.co/)
- Update frontend configuration
- Monitor initial transactions

## 🔧 Configuration Options

### Contract Variants

#### WordChain Core Contract
- File: `contracts/wordchain-core.clar`
- Features: Vocabulary rounds, commit-reveal, prize distribution
- Status: ✅ Production ready

#### Legacy Contracts (Reference)
- File: `contracts/tic-tac-toe.clar` - Original game
- File: `contracts/tic-tac-toe-improved.clar` - Enhanced version

### Deployment Parameters

```toml
# Clarinet.toml
[contracts.wordchain-core]
path = "contracts/wordchain-core.clar"
clarity_version = 2
epoch = 2.4

# Legacy contracts:
[contracts.tic-tac-toe]
path = "contracts/tic-tac-toe.clar"
clarity_version = 2
epoch = 2.4
```

## 📊 Gas Cost Estimates

| Function | Testnet Cost | Mainnet Cost (Est.) |
|----------|--------------|-------------------|
| `start-round` | ~3,000 STX | ~0.003 STX |
| `join-round` | ~2,000 STX | ~0.002 STX |
| `reveal-answer` | ~2,500 STX | ~0.0025 STX |
| Read functions | Free | Free |

## 🛠️ Troubleshooting

### Common Issues

#### "Contract not found"
```bash
# Check contract is in correct directory
ls contracts/

# Verify Clarinet.toml configuration
cat Clarinet.toml
```

#### "Insufficient funds"
```bash
# Check account balance
clarinet accounts balance

# Fund testnet account if needed
```

#### "Invalid syntax"
```bash
# Check contract syntax
clarinet check

# Review error messages carefully
```

### Testing Issues

#### Tests failing
```bash
# Run individual tests to isolate issues
clarinet test --filter "test-name"

# Check test setup and assertions
```

## 📱 Frontend Integration

### Contract Interaction Example
```javascript
// Using @stacks/transactions
import { 
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  uintCV,
  stringAsciiCV,
  listCV,
  bufferCV
} from '@stacks/transactions';

// Start vocabulary round
const txOptions = {
  contractAddress: 'YOUR_CONTRACT_ADDRESS',
  contractName: 'wordchain-core',
  functionName: 'start-round',
  functionArgs: [
    stringAsciiCV("ephemeral"),
    listCV([
      stringAsciiCV("Lasting a short time"),
      stringAsciiCV("Everlasting"),
      stringAsciiCV("Painful"),
      stringAsciiCV("Colorful")
    ]),
    bufferCV(Buffer.from('1234567890abcdef', 'hex'))
  ],
  senderKey: privateKey,
  network: new StacksTestnet(),
  anchorMode: AnchorMode.Any,
};

const transaction = await makeContractCall(txOptions);
const broadcastResponse = await broadcastTransaction(transaction, network);
```

## 📈 Monitoring & Analytics

### Key Metrics to Track
- Total vocabulary rounds created
- Player participation rate
- Average round completion time
- Total STX prize pool volume
- Learning engagement metrics
- Win rate distributions

### Monitoring Tools
- Stacks Explorer for transaction history
- Custom analytics dashboard
- Error tracking and logging

## 🔒 Security Considerations

### Pre-Deployment
1. Comprehensive test coverage for all game scenarios
2. Commit-reveal scheme validation
3. Prize distribution logic verification
4. Access control testing
5. Security audit (recommended for mainnet)

### Post-Deployment
1. Monitor round creation and completion
2. Track prize distribution accuracy
3. Validate answer hash integrity
4. Monitor for admin key security
5. User feedback and bug reports

## 📞 Support

For deployment issues:
1. Check [Clarinet Documentation](https://docs.hiro.so/clarinet)
2. Review [Stacks Documentation](https://docs.stacks.co/)
3. Join [Stacks Discord](https://discord.gg/stacks) for community support
