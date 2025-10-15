
'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, 
  Plus, 
  Eye, 
  Hash, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  Loader2,
  Coins,
  BookOpen,
  RefreshCw,
  Calendar
} from 'lucide-react'
import { 
  WordChainWriter, 
  WordChainReader,
  generateAnswerHash,
  isValidAsciiString,
  sanitizeString,
  WORDCHAIN_CONTRACT,
  checkContractDeployment,
  Round,
  extractBooleanValue,
  extractNumericValue,
  NETWORK
} from '../lib/wordchain-contract'
import { autoRevealService } from '../lib/auto-reveal-service'

interface AdminPanelProps {
  userSession: any
}

interface RoundHistoryItem {
  roundId: number
  round: Round | null
  isRevealed: boolean
}

export default function AdminPanel({ userSession }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'reveal'>('create')
  
  // Create Round State
  const [word, setWord] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctOption, setCorrectOption] = useState<number>(1)
  const [isCreating, setIsCreating] = useState(false)
  const [createTxId, setCreateTxId] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  
  // Reveal Answer State
  const [revealRoundId, setRevealRoundId] = useState<number>(1)
  const [correctAnswer, setCorrectAnswer] = useState('')
  const [revealCorrectOption, setRevealCorrectOption] = useState<number>(1)
  const [isRevealing, setIsRevealing] = useState(false)
  const [revealTxId, setRevealTxId] = useState<string | null>(null)
  const [revealError, setRevealError] = useState<string | null>(null)
  
  // Round History State
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Fetch round history when reveal tab is active
  useEffect(() => {
    if (activeTab === 'reveal') {
      fetchRoundHistory()
    }
  }, [activeTab])

  // Check contract deployment on component mount
  useEffect(() => {
    const checkContract = async () => {
      console.log('🔍 AdminPanel: Checking contract deployment...')
      const isDeployed = await checkContractDeployment()
      console.log('📊 AdminPanel: Contract deployed:', isDeployed)
      
      if (!isDeployed) {
        console.warn('⚠️ AdminPanel: Contract not deployed!')
      }
    }
    
    checkContract()
  }, [])

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const fetchRoundHistory = async () => {
    setIsLoadingHistory(true)
    setHistoryError(null)
    
    try {
      console.log('🔍 AdminPanel: Starting to fetch round history...')
      
      const config = await WordChainReader.getGameConfig()
      console.log('📊 AdminPanel: Game config:', config)
      
      const currentRoundId = config['current-round-id'] || 0
      console.log('🎯 AdminPanel: Current round ID:', currentRoundId)
      
      if (currentRoundId === 0) {
        console.log('ℹ️ AdminPanel: No rounds found (current round ID is 0)')
        setHistoryError('No rounds have been created yet')
        return
      }
      
      const history: RoundHistoryItem[] = []
      
      // Fetch last 10 rounds
      const startRound = Math.max(1, currentRoundId - 9)
      console.log(`🔄 AdminPanel: Fetching rounds ${startRound} to ${currentRoundId}`)
      
      for (let i = startRound; i <= currentRoundId; i++) {
        try {
          console.log(`🔍 AdminPanel: Fetching round ${i}...`)
          const round = await WordChainReader.getRound(i)
          console.log(`📊 AdminPanel: Round ${i} data:`, round)
          
          if (round) {
            // Debug the is-revealed flag extraction
            console.log(`🔍 AdminPanel: Round ${i} raw is-revealed:`, round['is-revealed'])
            console.log(`🔍 AdminPanel: Round ${i} full round data:`, round)
            
            const isRevealed = extractBooleanValue(round['is-revealed'])
            console.log(`✅ AdminPanel: Round ${i} found, revealed: ${isRevealed} (extracted from: ${round['is-revealed']})`)
            
            // Also check if correct-option is set (another indicator of revelation)
            const correctOption = round['correct-option']
            console.log(`🎯 AdminPanel: Round ${i} correct-option:`, correctOption)
            
            history.push({
              roundId: i,
              round,
              isRevealed
            })
          } else {
            console.log(`⚠️ AdminPanel: Round ${i} returned null/undefined`)
          }
        } catch (error) {
          console.warn(`❌ AdminPanel: Could not fetch round ${i}:`, error)
        }
      }
      
      console.log(`📋 AdminPanel: Total rounds fetched: ${history.length}`)
      console.log('📊 AdminPanel: Round history:', history)
      
      // Sort by round ID descending (most recent first)
      history.sort((a, b) => b.roundId - a.roundId)
      setRoundHistory(history)
      
      if (history.length === 0) {
        setHistoryError('No valid rounds found in the specified range')
      }
    } catch (error) {
      console.error('❌ AdminPanel: Error fetching round history:', error)
      setHistoryError(`Failed to load round history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  const selectRoundForReveal = (roundItem: RoundHistoryItem) => {
    if (roundItem.round && !roundItem.isRevealed) {
      setRevealRoundId(roundItem.roundId)
      // Pre-fill the correct answer if we can determine it from the options
      if (roundItem.round.options && roundItem.round.options.length > 0) {
        setCorrectAnswer('')
        setRevealCorrectOption(1)
      }
    }
  }

  const checkRoundStatus = async (roundId: number) => {
    console.log(`🔍 AdminPanel: Manually checking round ${roundId} status...`)
    try {
      const round = await WordChainReader.getRound(roundId)
      console.log(`📊 AdminPanel: Manual round ${roundId} check:`, round)
      
      if (round) {
        console.log(`🔍 AdminPanel: Round ${roundId} is-revealed raw:`, round['is-revealed'])
        console.log(`🔍 AdminPanel: Round ${roundId} correct-option:`, round['correct-option'])
        console.log(`🔍 AdminPanel: Round ${roundId} is-active:`, round['is-active'])
        console.log(`🔍 AdminPanel: Round ${roundId} reveal-block:`, round['reveal-block'])
        console.log(`🔍 AdminPanel: Round ${roundId} start-block:`, round['start-block'])
        
        const isRevealed = extractBooleanValue(round['is-revealed'])
        console.log(`✅ AdminPanel: Round ${roundId} extracted is-revealed:`, isRevealed)
        
        // Check if the round should be revealed based on block height
        try {
          const currentBlock = await fetch(`${NETWORK.coreApiUrl}/v2/info`)
            .then(res => res.json())
            .then(data => data.stacks_tip_height || 0)
          
          const revealBlock = extractNumericValue(round['reveal-block'])
          console.log(`🔍 AdminPanel: Current block: ${currentBlock}, Reveal block: ${revealBlock}`)
          
          if (currentBlock >= revealBlock) {
            console.log(`⚠️ AdminPanel: Round ${roundId} should be revealed! Current block (${currentBlock}) >= reveal block (${revealBlock})`)
            
            // Check if correct-option is set (indicates manual revelation)
            const correctOption = round['correct-option']
            if (correctOption && correctOption !== null) {
              console.log(`🎯 AdminPanel: Round ${roundId} has correct-option set: ${correctOption}, but is-revealed is still false!`)
              console.log(`🚨 AdminPanel: This indicates a contract bug - round was revealed but flag not set!`)
            } else {
              console.log(`⏰ AdminPanel: Round ${roundId} has passed reveal block but was never manually revealed`)
              
              // Show suggestion to reveal the round
              const shouldReveal = window.confirm(
                `Round ${roundId} has expired but was never revealed.\n\n` +
                `This means players can't receive their winnings and stats won't update.\n\n` +
                `Would you like to reveal this round now?\n\n` +
                `Note: You'll need to know the correct answer to reveal it properly.`
              )
              
              if (shouldReveal) {
                // Pre-fill the reveal form with this round
                setRevealRoundId(roundId)
                setActiveTab('reveal')
                alert(`Round ${roundId} has been selected for revelation. Please enter the correct answer and click "Reveal Answer".`)
              }
            }
          } else {
            console.log(`⏳ AdminPanel: Round ${roundId} hasn't reached reveal block yet`)
          }
        } catch (blockError) {
          console.error(`❌ AdminPanel: Error checking block height:`, blockError)
        }
        
        // Refresh the round history after manual check
        fetchRoundHistory()
      }
    } catch (error) {
      console.error(`❌ AdminPanel: Error checking round ${roundId}:`, error)
    }
  }

  const createRound = async () => {
    setCreateError(null)
    setCreateTxId(null)
    
    if (!word.trim() || options.some(opt => !opt.trim())) {
      setCreateError('Please fill in the word and all options')
      return
    }

    // Check if contract is deployed first
    console.log('🔍 Checking contract deployment...')
    const isDeployed = await checkContractDeployment()
    if (!isDeployed) {
      setCreateError(`Contract not found!\n\nThe contract ${WORDCHAIN_CONTRACT.address}.${WORDCHAIN_CONTRACT.name} is not deployed on testnet.\n\nPlease:\n1. Deploy the contract first\n2. Update the contract address in the code\n3. Try again`)
      return
    }
    console.log('✅ Contract is deployed!')

    // Validate and sanitize strings
    const cleanWord = sanitizeString(word, 50)
    const cleanOptions = options.map(opt => sanitizeString(opt, 100))

    if (!cleanWord || cleanOptions.some(opt => !opt)) {
      setCreateError('Please ensure all fields contain valid ASCII text')
      return
    }

    // Additional validation for ASCII characters
    if (!isValidAsciiString(cleanWord) || !cleanOptions.every(opt => isValidAsciiString(opt))) {
      setCreateError('Please use only ASCII characters (no special unicode characters)')
      return
    }

    setIsCreating(true)
    try {
      // Generate answer hash
      const correctAnswerText = cleanOptions[correctOption - 1]
      const answerHash = await generateAnswerHash(cleanWord, correctAnswerText)
      
      console.log('Creating round with:', {
        word: cleanWord,
        options: cleanOptions,
        correctOption,
        answerHash: Array.from(answerHash)
      })
      
      const result = await WordChainWriter.startRound(
        userSession,
        cleanWord,
        cleanOptions,
        answerHash
      )
      
      if (result.success && result.txId) {
        setCreateTxId(result.txId)
        
        // Store the correct answer for auto-revelation
        try {
          const config = await WordChainReader.getGameConfig()
          const nextRoundId = (config['current-round-id'] || 0) + 1
          autoRevealService.storeCorrectAnswer(
            nextRoundId,
            correctAnswerText,
            correctOption
          )
          console.log(`💾 AdminPanel: Stored correct answer for round ${nextRoundId}`)
        } catch (error) {
          console.warn('⚠️ AdminPanel: Could not store correct answer for auto-reveal:', error)
        }
        
        // Reset form
        setWord('')
        setOptions(['', '', '', ''])
        setCorrectOption(1)
      } else {
        // Handle specific error types
        if (result.error?.includes('NotEnoughFunds')) {
          setCreateError('Insufficient funds! You need testnet STX to create rounds. Please:\n\n1. Get testnet STX from the Stacks faucet\n2. Make sure your wallet is connected to testnet\n3. Try again with sufficient balance')
        } else if (result.error?.includes('NoSuchContract')) {
          setCreateError('Contract not found! Please check:\n\n1. Contract address is correct\n2. Contract is deployed on testnet\n3. Network connection is stable')
        } else {
          setCreateError(`Failed to create round: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('Error creating round:', error)
      let errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      if (errorMessage.includes('NotEnoughFunds')) {
        errorMessage = 'Insufficient testnet STX balance. Please get testnet STX from the faucet.'
      } else if (errorMessage.includes('NoSuchContract')) {
        errorMessage = 'Contract not found. Please verify the contract is deployed correctly.'
      }
      
      setCreateError(`Error creating round: ${errorMessage}`)
    } finally {
      setIsCreating(false)
    }
  }

  const revealAnswer = async () => {
    setRevealError(null)
    setRevealTxId(null)
    
    if (!correctAnswer.trim() || revealRoundId < 1) {
      setRevealError('Please enter the correct answer and round ID')
      return
    }

    setIsRevealing(true)
    try {
      const result = await WordChainWriter.revealAnswer(
        userSession,
        revealRoundId,
        correctAnswer.trim(),
        revealCorrectOption
      )
      
      if (result.success && result.txId) {
        setRevealTxId(result.txId)
        // Reset form
        setCorrectAnswer('')
        setRevealRoundId(revealRoundId + 1)
        setRevealCorrectOption(1)
      } else {
        setRevealError(`Failed to reveal answer: ${result.error}`)
      }
    } catch (error) {
      console.error('Error revealing answer:', error)
      setRevealError('Error revealing answer. Please try again.')
    } finally {
      setIsRevealing(false)
    }
  }

  if (!userSession.isUserSignedIn()) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <AlertTriangle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h3>
          <p className="text-gray-600">
            Please connect your wallet to access the admin panel.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="card mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="h-6 w-6 text-primary-600" />
          <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Manage WordChain rounds and reveal answers. Contract: {WORDCHAIN_CONTRACT.address}.{WORDCHAIN_CONTRACT.name}
        </p>
        
        
        {/* Funding Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2 mb-2">
            <Coins className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-800">Need Testnet STX?</span>
          </div>
          <p className="text-sm text-blue-700 mb-2">
            Creating rounds requires testnet STX for transaction fees. Get free testnet STX from:
          </p>
          <a 
            href="https://explorer.stacks.co/sandbox/faucet?chain=testnet" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 underline hover:no-underline"
          >
            Stacks Testnet Faucet
          </a>
        </div>
        
        {/* Auto-Reveal Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <RefreshCw className="h-5 w-5 text-green-600" />
            <span className="font-medium text-green-800">Auto-Reveal System</span>
          </div>
          <p className="text-sm text-green-700 mb-2">
            🤖 Automatic round revelation is now <strong>ACTIVE</strong>! Rounds will be automatically revealed when they expire.
          </p>
          <div className="text-xs text-green-600">
            <p>✅ Checks for expired rounds every minute</p>
            <p>✅ Uses stored correct answers from round creation</p>
            <p>✅ Falls back to most popular player choice if needed</p>
            <p>✅ Ensures player stats are always updated correctly</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-8">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'create'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Plus className="h-4 w-4 inline mr-2" />
          Create Round
        </button>
        <button
          onClick={() => setActiveTab('reveal')}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'reveal'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Eye className="h-4 w-4 inline mr-2" />
          Reveal Answer
        </button>
      </div>

      {/* Create Round Tab */}
      {activeTab === 'create' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Create New Vocabulary Round</h3>
          
          <div className="space-y-6">
            {/* Word Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vocabulary Word
              </label>
              <input
                type="text"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Enter the vocabulary word (e.g., 'Serendipity')"
                maxLength={50}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Max 50 characters. Use only letters, numbers, spaces, and basic punctuation.
              </p>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Definition Options
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Each option max 100 characters. Use only ASCII characters (letters, numbers, spaces, basic punctuation).
              </p>
              <div className="space-y-3">
                {options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      correctOption === index + 1 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Definition option ${index + 1}`}
                      maxLength={100}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      onClick={() => setCorrectOption(index + 1)}
                      className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                        correctOption === index + 1
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {correctOption === index + 1 ? 'Correct' : 'Mark Correct'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Hash Preview */}
            {word && options[correctOption - 1] && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Hash className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Answer Hash Preview</span>
                </div>
                <p className="text-xs text-gray-600 font-mono break-all">
                  Word: {word} + Correct Answer: {options[correctOption - 1]}
                </p>
              </div>
            )}

            {/* Error Message */}
            {createError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Error</span>
                </div>
                <p className="text-sm text-red-700 whitespace-pre-wrap">
                  {createError}
                </p>
              </div>
            )}

            {/* Success Message */}
            {createTxId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Round Created Successfully!</span>
                </div>
                <p className="text-sm text-green-700">
                  Transaction ID: 
                  <a 
                    href={`https://explorer.stacks.co/txid/${createTxId}?chain=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline hover:no-underline"
                  >
                    {createTxId}
                  </a>
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={createRound}
                disabled={isCreating || !word.trim() || options.some(opt => !opt.trim())}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating Round...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Round
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reveal Answer Tab */}
      {activeTab === 'reveal' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Reveal Round Answer</h3>
          
          <div className="space-y-6">
            {/* Round ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Round ID
              </label>
              <input
                type="number"
                value={revealRoundId}
                onChange={(e) => setRevealRoundId(parseInt(e.target.value) || 1)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Correct Answer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Answer (Definition)
              </label>
              <input
                type="text"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="Enter the exact correct definition"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Correct Option Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correct Option Number
              </label>
              <select
                value={revealCorrectOption}
                onChange={(e) => setRevealCorrectOption(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value={1}>Option 1</option>
                <option value={2}>Option 2</option>
                <option value={3}>Option 3</option>
                <option value={4}>Option 4</option>
              </select>
            </div>

            {/* Round History Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-gray-600" />
                  <span className="font-medium text-gray-800">Recent Questions & Answers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={fetchRoundHistory}
                    disabled={isLoadingHistory}
                    className="flex items-center space-x-1 px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingHistory ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                  
                  {roundHistory.some(r => !r.isRevealed) && (
                    <button
                      onClick={async () => {
                        const expiredRounds = []
                        for (const item of roundHistory.filter(r => !r.isRevealed)) {
                          try {
                            const currentBlock = await fetch(`${NETWORK.coreApiUrl}/v2/info`)
                              .then(res => res.json())
                              .then(data => data.stacks_tip_height || 0)
                            
                            const revealBlock = extractNumericValue(item.round?.['reveal-block'])
                            if (currentBlock >= revealBlock) {
                              expiredRounds.push(item.roundId)
                            }
                          } catch (error) {
                            console.warn(`Could not check round ${item.roundId}:`, error)
                          }
                        }
                        
                        if (expiredRounds.length > 0) {
                          alert(`Found ${expiredRounds.length} expired rounds that need revelation: ${expiredRounds.join(', ')}\n\nPlease reveal them manually to update player stats and distribute winnings.`)
                        } else {
                          alert('No expired rounds found that need revelation.')
                        }
                      }}
                      className="flex items-center space-x-1 px-3 py-1 text-sm bg-orange-200 hover:bg-orange-300 text-orange-700 rounded-md transition-colors"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <span>Check Expired</span>
                    </button>
                  )}
                </div>
              </div>

              {isLoadingHistory && (
                <div className="text-center py-4">
                  <Loader2 className="h-6 w-6 text-gray-400 mx-auto animate-spin" />
                  <p className="text-sm text-gray-500 mt-2">Loading round history...</p>
                </div>
              )}

              {historyError && (
                <div className="text-center py-4">
                  <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" />
                  <p className="text-sm text-red-600 mb-3">{historyError}</p>
                  <button
                    onClick={fetchRoundHistory}
                    className="px-4 py-2 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              )}

              {!isLoadingHistory && !historyError && roundHistory.length === 0 && (
                <div className="text-center py-4">
                  <Calendar className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No rounds found</p>
                </div>
              )}

              {!isLoadingHistory && !historyError && roundHistory.length > 0 && (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {roundHistory.map((item) => (
                    <div
                      key={item.roundId}
                      onClick={() => selectRoundForReveal(item)}
                      className={`p-3 border rounded-lg transition-all cursor-pointer ${
                        item.isRevealed
                          ? 'border-green-200 bg-green-50 hover:bg-green-100'
                          : 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                      } ${
                        revealRoundId === item.roundId ? 'ring-2 ring-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-900">
                            Round #{item.roundId}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            item.isRevealed
                              ? 'bg-green-200 text-green-800'
                              : 'bg-orange-200 text-orange-800'
                          }`}>
                            {item.isRevealed ? 'Revealed' : 'Pending'}
                          </span>
                        </div>
                        {!item.isRevealed && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">Click to select</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                checkRoundStatus(item.roundId)
                              }}
                              className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                            >
                              Check Status
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {item.round && (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-600">Word:</span>
                            <span className="text-sm font-medium text-gray-900">
                              {item.round.word}
                            </span>
                          </div>
                          
                          {item.round.options && item.round.options.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-600">Options:</span>
                              <div className="mt-1 space-y-1">
                                {item.round.options.map((option, index) => (
                                  <div key={index} className="flex items-start space-x-2">
                                    <span className="text-xs text-gray-500 mt-0.5">
                                      {index + 1}.
                                    </span>
                                    <span className="text-xs text-gray-700 flex-1">
                                      {option}
                                    </span>
                                    {item.isRevealed && item.round && item.round['correct-option'] === (index + 1) && (
                                      <CheckCircle className="h-3 w-3 text-green-600 mt-0.5" />
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Example */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Hash className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-800">Example</span>
              </div>
              <div className="text-sm text-blue-700">
                <p><strong>Word:</strong> Serendipity</p>
                <p><strong>Options:</strong></p>
                <ul className="list-disc list-inside ml-2 mt-1">
                  <li>A pleasant surprise or discovery</li>
                  <li>A type of flower</li>
                  <li>A mathematical concept</li>
                  <li>A cooking technique</li>
                </ul>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span className="font-medium text-orange-800">Important</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Make sure the correct answer exactly matches what was used to generate the hash when creating the round.
                This action will distribute prizes to winners and cannot be undone.
              </p>
            </div>

            {/* Error Message */}
            {revealError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">Error</span>
                </div>
                <p className="text-sm text-red-700 whitespace-pre-wrap">
                  {revealError}
                </p>
              </div>
            )}

            {/* Success Message */}
            {revealTxId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-medium text-green-800">Answer Revealed Successfully!</span>
                </div>
                <p className="text-sm text-green-700">
                  Transaction ID: 
                  <a 
                    href={`https://explorer.stacks.co/txid/${revealTxId}?chain=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline hover:no-underline"
                  >
                    {revealTxId}
                  </a>
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                onClick={revealAnswer}
                disabled={isRevealing || !correctAnswer.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRevealing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Revealing Answer...
                  </>
                ) : (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Reveal Answer & Distribute Prizes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}