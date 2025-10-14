#!/usr/bin/env node

/**
 * WordChain Admin Tool - Round Creator
 * 
 * This tool helps administrators create new vocabulary rounds
 * with proper answer hashing for the commit-reveal scheme.
 */

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class RoundCreator {
  constructor() {
    this.roundData = {
      word: '',
      options: [],
      correctAnswer: '',
      correctOption: 0,
      answerHash: ''
    };
  }

  async createRound() {
    console.log('🧠 WordChain Round Creator\n');
    console.log('Create a new vocabulary challenge round\n');

    try {
      await this.getWordInput();
      await this.getOptionsInput();
      await this.selectCorrectAnswer();
      this.generateAnswerHash();
      this.displayRoundSummary();
      this.generateClarityCall();
    } catch (error) {
      console.error('Error creating round:', error.message);
    } finally {
      rl.close();
    }
  }

  async getWordInput() {
    return new Promise((resolve) => {
      rl.question('Enter the vocabulary word: ', (word) => {
        if (!word.trim()) {
          console.log('❌ Word cannot be empty');
          return this.getWordInput().then(resolve);
        }
        this.roundData.word = word.trim();
        console.log(`✅ Word: "${this.roundData.word}"\n`);
        resolve();
      });
    });
  }

  async getOptionsInput() {
    console.log('Enter 4 possible definitions:\n');
    
    for (let i = 1; i <= 4; i++) {
      await new Promise((resolve) => {
        rl.question(`Option ${i}: `, (option) => {
          if (!option.trim()) {
            console.log('❌ Option cannot be empty');
            return this.getOptionsInput().then(resolve);
          }
          this.roundData.options.push(option.trim());
          resolve();
        });
      });
    }
    
    console.log('\n✅ All options entered\n');
  }

  async selectCorrectAnswer() {
    console.log('Which option is correct?\n');
    
    this.roundData.options.forEach((option, index) => {
      console.log(`${index + 1}. ${option}`);
    });
    
    return new Promise((resolve) => {
      rl.question('\nEnter the correct option number (1-4): ', (answer) => {
        const optionNum = parseInt(answer);
        
        if (isNaN(optionNum) || optionNum < 1 || optionNum > 4) {
          console.log('❌ Please enter a number between 1 and 4');
          return this.selectCorrectAnswer().then(resolve);
        }
        
        this.roundData.correctOption = optionNum;
        this.roundData.correctAnswer = this.roundData.options[optionNum - 1];
        console.log(`✅ Correct answer: Option ${optionNum} - "${this.roundData.correctAnswer}"\n`);
        resolve();
      });
    });
  }

  generateAnswerHash() {
    // Create hash using word + correct answer for commit-reveal scheme
    const hashInput = this.roundData.word + this.roundData.correctAnswer;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    this.roundData.answerHash = '0x' + hash;
    console.log('🔐 Answer hash generated for commit-reveal scheme\n');
  }

  displayRoundSummary() {
    console.log('📋 Round Summary:');
    console.log('================');
    console.log(`Word: "${this.roundData.word}"`);
    console.log('Options:');
    this.roundData.options.forEach((option, index) => {
      const marker = (index + 1) === this.roundData.correctOption ? '✅' : '  ';
      console.log(`  ${marker} ${index + 1}. ${option}`);
    });
    console.log(`Correct Answer: Option ${this.roundData.correctOption}`);
    console.log(`Answer Hash: ${this.roundData.answerHash}`);
    console.log('');
  }

  generateClarityCall() {
    console.log('🔧 Clarity Contract Call:');
    console.log('=========================');
    
    const clarityCall = `(contract-call? .wordchain-core start-round 
  "${this.roundData.word}"
  (list 
    "${this.roundData.options[0]}"
    "${this.roundData.options[1]}" 
    "${this.roundData.options[2]}"
    "${this.roundData.options[3]}")
  ${this.roundData.answerHash})`;

    console.log(clarityCall);
    console.log('');

    console.log('📱 Frontend/CLI Usage:');
    console.log('======================');
    
    const jsCall = `// JavaScript/TypeScript
const txOptions = {
  contractAddress: 'YOUR_CONTRACT_ADDRESS',
  contractName: 'wordchain-core',
  functionName: 'start-round',
  functionArgs: [
    stringAsciiCV("${this.roundData.word}"),
    listCV([
      stringAsciiCV("${this.roundData.options[0]}"),
      stringAsciiCV("${this.roundData.options[1]}"),
      stringAsciiCV("${this.roundData.options[2]}"),
      stringAsciiCV("${this.roundData.options[3]}")
    ]),
    bufferCV(Buffer.from("${this.roundData.answerHash.slice(2)}", "hex"))
  ],
  // ... other options
};`;

    console.log(jsCall);
    console.log('');

    console.log('🔓 Reveal Answer (after round ends):');
    console.log('====================================');
    
    const revealCall = `(contract-call? .wordchain-core reveal-answer 
  u1  ;; round-id (update as needed)
  "${this.roundData.correctAnswer}"
  u${this.roundData.correctOption})`;

    console.log(revealCall);
    console.log('');

    console.log('💾 Save this information securely!');
    console.log('You will need the correct answer and option number to reveal results.');
  }
}

// Educational word suggestions
const SAMPLE_WORDS = [
  {
    word: "Ephemeral",
    options: [
      "Lasting a short time",
      "Everlasting and eternal", 
      "Extremely painful",
      "Brightly colorful"
    ],
    correct: 1
  },
  {
    word: "Ubiquitous", 
    options: [
      "Extremely rare",
      "Very expensive",
      "Present everywhere",
      "Difficult to understand"
    ],
    correct: 3
  },
  {
    word: "Serendipity",
    options: [
      "A type of musical instrument",
      "Pleasant surprise or fortunate accident", 
      "Fear of heights",
      "Ancient writing system"
    ],
    correct: 2
  }
];

function showSampleWords() {
  console.log('💡 Sample Word Ideas:');
  console.log('====================');
  SAMPLE_WORDS.forEach((sample, index) => {
    console.log(`${index + 1}. "${sample.word}"`);
    sample.options.forEach((option, optIndex) => {
      const marker = (optIndex + 1) === sample.correct ? '✅' : '  ';
      console.log(`   ${marker} ${optIndex + 1}. ${option}`);
    });
    console.log('');
  });
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('WordChain Round Creator');
    console.log('Usage: node round-creator.js [options]');
    console.log('');
    console.log('Options:');
    console.log('  --help, -h     Show this help message');
    console.log('  --samples, -s  Show sample word ideas');
    console.log('');
    process.exit(0);
  }
  
  if (args.includes('--samples') || args.includes('-s')) {
    showSampleWords();
    process.exit(0);
  }
  
  const creator = new RoundCreator();
  creator.createRound();
}

module.exports = RoundCreator;
