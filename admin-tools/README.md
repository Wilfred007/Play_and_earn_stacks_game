# WordChain Admin Tools

This directory contains administrative tools for managing WordChain vocabulary rounds.

## 🛠️ Available Tools

### Round Creator (`round-creator.js`)

Interactive tool for creating new vocabulary rounds with proper cryptographic hashing.

#### Usage

```bash
# Create a new round interactively
node round-creator.js

# Show sample word ideas
node round-creator.js --samples

# Show help
node round-creator.js --help
```

#### Features

- **Interactive Input**: Guided prompts for word and options
- **Answer Hashing**: Automatic SHA256 hash generation for commit-reveal
- **Multiple Formats**: Outputs Clarity calls and JavaScript code
- **Validation**: Input validation and error checking
- **Sample Words**: Built-in educational vocabulary examples

#### Example Session

```bash
$ node round-creator.js

🧠 WordChain Round Creator

Create a new vocabulary challenge round

Enter the vocabulary word: ephemeral
✅ Word: "ephemeral"

Enter 4 possible definitions:

Option 1: Lasting a short time
Option 2: Everlasting and eternal
Option 3: Extremely painful  
Option 4: Brightly colorful

✅ All options entered

Which option is correct?

1. Lasting a short time
2. Everlasting and eternal
3. Extremely painful
4. Brightly colorful

Enter the correct option number (1-4): 1
✅ Correct answer: Option 1 - "Lasting a short time"

🔐 Answer hash generated for commit-reveal scheme

📋 Round Summary:
================
Word: "ephemeral"
Options:
  ✅ 1. Lasting a short time
     2. Everlasting and eternal
     3. Extremely painful
     4. Brightly colorful
Correct Answer: Option 1
Answer Hash: 0x8f7a3c2b1e9d4f6a8c5e7b9d2f4a6c8e1b3d5f7a9c2e4b6d8f1a3c5e7b9d2f4a6c8e

🔧 Clarity Contract Call:
=========================
(contract-call? .wordchain-core start-round 
  "ephemeral"
  (list 
    "Lasting a short time"
    "Everlasting and eternal" 
    "Extremely painful"
    "Brightly colorful")
  0x8f7a3c2b1e9d4f6a8c5e7b9d2f4a6c8e1b3d5f7a9c2e4b6d8f1a3c5e7b9d2f4a6c8e)
```

## 🔐 Security Best Practices

### Answer Hash Generation

The tool uses SHA256 hashing with the format:
```
hash = SHA256(word + correctAnswer)
```

This ensures:
- **Deterministic**: Same input always produces same hash
- **Unpredictable**: Cannot reverse-engineer the answer from hash
- **Verifiable**: Can prove answer matches hash during reveal

### Admin Key Management

**For Testnet:**
- Use dedicated testnet keys
- Store keys securely (environment variables)
- Never commit private keys to version control

**For Mainnet:**
- Use hardware wallet or secure key management
- Consider multi-signature setup
- Implement key rotation procedures

### Round Creation Workflow

1. **Prepare Content**: Use educational, appropriate vocabulary
2. **Generate Round**: Use this tool to create properly hashed rounds
3. **Deploy Round**: Submit transaction to start round
4. **Monitor**: Track participation and engagement
5. **Reveal Answer**: After round ends, reveal with correct answer
6. **Verify**: Ensure prize distribution is correct

## 📚 Educational Content Guidelines

### Word Selection Criteria

- **Appropriate Level**: Challenging but learnable
- **Educational Value**: Builds vocabulary meaningfully
- **Cultural Sensitivity**: Inclusive and respectful
- **Variety**: Mix of word types, origins, and difficulty

### Definition Quality

- **Accuracy**: Precise and correct definitions
- **Clarity**: Easy to understand explanations
- **Distinctiveness**: Options should be clearly different
- **Plausibility**: Wrong answers should be believable

### Sample Categories

**Academic Vocabulary**
- Scientific terms
- Literary words
- Historical concepts
- Mathematical terminology

**Everyday Advanced Words**
- Sophisticated synonyms
- Descriptive adjectives
- Professional terminology
- Cultural concepts

**Etymology & Origins**
- Latin/Greek roots
- Foreign borrowings
- Compound words
- Modern coinages

## 🔄 Round Management Process

### 1. Planning Phase
- Select vocabulary theme/category
- Prepare 5-10 rounds in advance
- Review content for quality and appropriateness

### 2. Creation Phase
- Use round creator tool
- Generate proper hashes
- Test contract calls on testnet
- Document answers securely

### 3. Deployment Phase
- Submit start-round transaction
- Verify round is active
- Monitor for any issues
- Announce to community

### 4. Active Phase
- Monitor participation
- Track prize pool growth
- Engage with community
- Prepare for reveal

### 5. Completion Phase
- Wait for round end block
- Submit reveal transaction
- Verify prize distribution
- Analyze round performance

## 🚀 Future Enhancements

### Planned Tools

**Batch Round Creator**
- Create multiple rounds at once
- CSV import functionality
- Automated scheduling

**Analytics Dashboard**
- Round performance metrics
- Player engagement analysis
- Prize distribution tracking

**Content Management**
- Word database integration
- Difficulty rating system
- Category management

**Automated Deployment**
- Scheduled round deployment
- Smart contract integration
- Error handling and recovery

## 🤝 Contributing

### Adding New Tools

1. Create tool in this directory
2. Follow existing naming conventions
3. Include comprehensive documentation
4. Add usage examples
5. Test thoroughly on testnet

### Improving Existing Tools

1. Maintain backward compatibility
2. Add feature flags for new functionality
3. Update documentation
4. Include migration guides if needed

## 📞 Support

For admin tool issues:
- Check tool documentation
- Test on Stacks testnet first
- Review contract deployment status
- Contact development team for critical issues
