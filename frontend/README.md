# WordChain Frontend

This is the frontend application for WordChain, built with Next.js, React, and TailwindCSS.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install
# or
yarn install
```

### Development

```bash
# Start development server
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Building for Production

```bash
# Build the application
npm run build
# or
yarn build

# Start production server
npm start
# or
yarn start
```

## 🏗️ Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── GameInterface.tsx  # Main game interface
│   ├── Leaderboard.tsx    # Player leaderboard
│   └── PlayerStats.tsx    # Player statistics
├── public/               # Static assets
└── package.json          # Dependencies and scripts
```

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file in the frontend directory:

```bash
# Stacks Network Configuration
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
NEXT_PUBLIC_CONTRACT_NAME=wordchain-core

# Optional: Analytics
NEXT_PUBLIC_GA_ID=your-google-analytics-id
```

### Wallet Integration

The app uses Hiro Wallet (formerly Blockstack) for Stacks blockchain integration:

- Connect/disconnect wallet functionality
- Transaction signing and broadcasting
- Read-only contract calls
- User session management

## 🎨 Styling

- **TailwindCSS** for utility-first styling
- **Custom components** with consistent design system
- **Responsive design** for mobile and desktop
- **Dark/light mode** support (future enhancement)

## 📱 Features

### Game Interface
- Display current vocabulary round
- Multiple choice answer selection
- Real-time round status and timer
- Transaction submission and tracking

### Leaderboard
- Top players by win rate and earnings
- Sortable statistics
- Achievement badges
- Community stats overview

### Player Statistics
- Personal game history
- Win rate and earnings tracking
- Progress visualization
- Achievement system

## 🔗 Blockchain Integration

### Smart Contract Interaction

```typescript
import { 
  makeContractCall,
  callReadOnlyFunction,
  uintCV,
  stringAsciiCV 
} from '@stacks/transactions'

// Join a round
const joinRound = async (option: number) => {
  const txOptions = {
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    contractName: process.env.NEXT_PUBLIC_CONTRACT_NAME,
    functionName: 'join-round',
    functionArgs: [uintCV(option)],
    // ... other options
  }
  
  const transaction = await makeContractCall(txOptions)
  return await broadcastTransaction(transaction, network)
}
```

### Read-Only Calls

```typescript
// Get current round data
const getCurrentRound = async () => {
  const result = await callReadOnlyFunction({
    contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    contractName: process.env.NEXT_PUBLIC_CONTRACT_NAME,
    functionName: 'get-current-round',
    functionArgs: [],
    network
  })
  
  return cvToJSON(result)
}
```

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test
# or
yarn test
```

## 📦 Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Set environment variables
4. Deploy automatically

### Manual Deployment

```bash
# Build the application
npm run build

# Export static files (if needed)
npm run export

# Deploy to your hosting provider
```

## 🛠️ Development Notes

### State Management
- React hooks for local state
- Context API for global state (future enhancement)
- Stacks Connect for wallet state

### Performance Optimizations
- Next.js automatic code splitting
- Image optimization
- Lazy loading of components
- Efficient re-rendering patterns

### Accessibility
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility

## 🐛 Troubleshooting

### Common Issues

**Wallet Connection Issues**
```bash
# Clear browser storage
localStorage.clear()
sessionStorage.clear()
```

**Transaction Failures**
- Check STX balance
- Verify network configuration
- Ensure contract is deployed
- Check transaction parameters

**Build Errors**
```bash
# Clear Next.js cache
rm -rf .next
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the WordChain ecosystem. See the main project LICENSE for details.
