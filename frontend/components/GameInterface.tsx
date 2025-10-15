'use client'

import { useState, useEffect } from 'react'
import { 
  Clock, 
  Users, 
  Coins, 
  CheckCircle, 
  AlertCircle,
  Brain,
  Timer,
  RefreshCw
} from 'lucide-react'
import { 
  WordChainReader, 
  WordChainWriter, 
  Round, 
  PlayerGuess, 
  GameConfig,
  microSTXToSTX,
  getBlockHeight,
  calculateTimeRemaining
} from '../lib/wordchain-contract'

interface GameInterfaceProps {
  userSession: any
  onNavigateToResults?: () => void
}

export default function GameInterface({ userSession, onNavigateToResults }: GameInterfaceProps) {
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [playerGuess, setPlayerGuess] = useState<PlayerGuess | null>(null)
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [blockHeight, setBlockHeight] = useState<number>(0)
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentRoundId, setCurrentRoundId] = useState<number>(0)
  const [timeRemaining, setTimeRemaining] = useState<string>('Unknown')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('Initializing GameInterface...')
    initializeData()
    const interval = setInterval(initializeData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (currentRound && blockHeight > 0) {
      // Convert reveal-block to number in case it's a string
      const revealBlockNum = typeof currentRound['reveal-block'] === 'string' 
        ? parseInt(currentRound['reveal-block'], 10) 
        : currentRound['reveal-block']
      
      console.log('⏰ Time calculation:', {
        revealBlock: revealBlockNum,
        currentBlock: blockHeight,
        difference: revealBlockNum - blockHeight
      })
      
      const remaining = calculateTimeRemaining(revealBlockNum, blockHeight)
      console.log('⏰ Time remaining result:', remaining)
      setTimeRemaining(typeof remaining === 'string' ? remaining : 'Unknown')
    }
  }, [currentRound, blockHeight])

  useEffect(() => {
    if (currentRoundId > 0 && userSession.isUserSignedIn()) {
      fetchPlayerGuess()
    }
  }, [currentRoundId, userSession])

  const initializeData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      await Promise.all([
        fetchGameConfig(),
        fetchCurrentRound(),
        updateBlockHeight()
      ])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error loading game data')
    }
    setIsLoading(false)
  }

  const fetchGameConfig = async () => {
    try {
      const config = await WordChainReader.getGameConfig()
      console.log('📊 Game config:', config)
      setGameConfig(config)
      setCurrentRoundId(config['current-round-id'] || 0)
    } catch (error) {
      console.error('Error fetching game config:', error)
      setGameConfig(null)
      setCurrentRoundId(0)
    }
  }

  const fetchCurrentRound = async () => {
    try {
      const round = await WordChainReader.getCurrentRound()
      console.log('📋 Raw current round:', round)
      
      if (round && typeof round === 'object') {
        // Log all the round properties to debug
        console.log('🔍 Round properties:', {
          word: round.word,
          'reveal-block': round['reveal-block'],
          'start-block': round['start-block'],
          'is-active': round['is-active'],
          'is-revealed': round['is-revealed']
        })
        
        console.log('✅ Current round loaded:', round)
        setCurrentRound(round as Round)
      } else {
        console.log('ℹ️ No round data returned')
        setCurrentRound(null)
      }
    } catch (error) {
      console.error('Error fetching current round:', error)
      setCurrentRound(null)
    }
  }

  const fetchPlayerGuess = async () => {
    if (!userSession.isUserSignedIn() || currentRoundId === 0) return

    try {
      const userData = userSession.loadUserData()
      const guess = await WordChainReader.getPlayerGuess(
        currentRoundId, 
        userData.profile.stxAddress.testnet
      )
      console.log('🎯 Player guess:', guess)
      setPlayerGuess(guess)
    } catch (error) {
      console.error('Error fetching player guess:', error)
    }
  }

  const updateBlockHeight = async () => {
    const height = await getBlockHeight()
    console.log('📦 Block height:', height)
    setBlockHeight(height)
  }

  const submitGuess = async () => {
    if (!selectedOption || !userSession.isUserSignedIn()) return

    setIsSubmitting(true)
    try {
      const result = await WordChainWriter.joinRound(userSession, selectedOption)
      
      if (result.success) {
        if (result.txId) {
          setTransactionId(result.txId)
        }
        
        // Refresh data after submission
        setTimeout(() => {
          fetchCurrentRound()
          fetchPlayerGuess()
        }, 2000)
      } else {
        console.error('Transaction failed:', result.error)
        alert(`Transaction failed: ${result.error}`)
      }
      
    } catch (error) {
      console.error('Error submitting guess:', error)
      alert('Error submitting guess. Please try again.')
    } finally {
    }
  }

  if (isLoading) {
    return (
      <div className="text-center py-12 px-6">
        <div className="max-w-md mx-auto p-8 bg-slate-800/60 border border-slate-700/50 rounded-2xl backdrop-blur-sm">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <h3 className="text-xl font-semibold text-white mb-2">Loading Game...</h3>
          <p className="text-slate-400">Fetching the latest vocabulary challenge</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 px-6">
        <div className="max-w-md mx-auto p-8 bg-slate-800/60 border border-slate-700/50 rounded-2xl backdrop-blur-sm">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Game</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <button 
            onClick={initializeData}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!currentRound) {
    return (
      <div className="text-center py-12 px-6">
        <div className="max-w-md mx-auto p-8 bg-slate-800/60 border border-slate-700/50 rounded-2xl backdrop-blur-sm">
          <Brain className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Active Round</h3>
          <p className="text-slate-400 mb-4">
            There is currently no vocabulary challenge active.
          </p>
          {gameConfig && (
            <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
              <p className="text-sm text-slate-300">
                Current Round ID: {gameConfig['current-round-id']}
              </p>
              <p className="text-sm text-slate-300">
                Entry Fee: {microSTXToSTX(gameConfig['entry-fee'])} STX
              </p>
            </div>
          )}
          <button 
            onClick={initializeData}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>
    )
  }

  const hasGuessed = playerGuess !== null
  const roundEnded = timeRemaining === 'Ended' || (currentRound && currentRound['is-revealed']) || (currentRound && !currentRound['is-active'])
  
  // Check if round is expired (reveal block is in the past)
  const isExpired = currentRound && blockHeight > 0 && currentRound['reveal-block'] < blockHeight
  
  console.log('🎮 Round status:', {
    timeRemaining,
    roundEnded,
    isActive: currentRound?.['is-active'],
    isRevealed: currentRound?.['is-revealed'],
    isExpired,
    revealBlock: currentRound?.['reveal-block'],
    currentBlock: blockHeight,
    hasGuessed
  })

  return (
    <div className="p-6">
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="p-6 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm text-center">
          <Timer className="h-8 w-8 text-blue-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Time Remaining</p>
          <p className="text-2xl font-bold text-white">{timeRemaining}</p>
        </div>
        
        <div className="p-6 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm text-center">
          <Users className="h-8 w-8 text-cyan-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Players Joined</p>
          <p className="text-2xl font-bold text-white">{currentRound['participant-count']}</p>
        </div>
        
        <div className="p-6 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm text-center">
          <Coins className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Prize Pool</p>
          <p className="text-2xl font-bold text-white">
            {microSTXToSTX(currentRound['total-pool']).toFixed(2)} STX
          </p>
        </div>
      </div>

      {/* Main Game Card */}
      <div className="p-8 bg-slate-800/60 border border-slate-700/50 rounded-2xl backdrop-blur-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            What does <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">{currentRound.word}</span> mean?
          </h2>
          <p className="text-slate-400">
            Choose the correct definition to earn your share of the prize pool
          </p>
        </div>

        {/* Options */}
        <div className="grid gap-4 mb-8">
          {currentRound.options && Array.isArray(currentRound.options) ? (
            currentRound.options.map((option, index) => {
              const optionNumber = index + 1
              const isSelected = selectedOption === optionNumber
              const isPlayerChoice = hasGuessed && playerGuess?.option === optionNumber
              
              return (
                <button
                  key={index}
                  onClick={() => !hasGuessed && !roundEnded && setSelectedOption(optionNumber)}
                  disabled={hasGuessed || roundEnded}
                  className={`option-card text-left ${
                    isSelected ? 'selected' : ''
                  } ${
                    isPlayerChoice ? 'bg-blue-50 border-blue-300' : ''
                  } ${
                    hasGuessed || roundEnded ? 'cursor-not-allowed opacity-75' : ''
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      isSelected || isPlayerChoice 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {optionNumber}
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{option}</p>
                      {isPlayerChoice && (
                        <div className="flex items-center space-x-1 mt-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span className="text-sm text-blue-600">Your choice</span>
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No options available</p>
            </div>
          )}
        </div>

        {/* Action Area */}
        <div className="border-t pt-6">
          {!hasGuessed && !roundEnded && (
            <div className="text-center">
              <button
                onClick={submitGuess}
                disabled={!selectedOption || isSubmitting}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : `Submit Guess (${microSTXToSTX(gameConfig?.['entry-fee'] || 0).toFixed(4)} STX)`}
              </button>
              <p className="text-sm text-gray-500 mt-2">
                Entry fee: {microSTXToSTX(gameConfig?.['entry-fee'] || 0).toFixed(4)} STX • You can only guess once per round
              </p>
            </div>
          )}

          {hasGuessed && !roundEnded && (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-green-600 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Guess Submitted!</span>
              </div>
              <p className="text-gray-600">
                You chose option {playerGuess?.option}. Results will be revealed when the round ends.
              </p>
            </div>
          )}

          {roundEnded && (
            <div className="text-center">
              <div className="flex items-center justify-center space-x-2 text-orange-600 mb-2">
                <AlertCircle className="h-5 w-5" />
                <span className="font-semibold">Round Ended</span>
              </div>
              {currentRound && currentRound['is-revealed'] ? (
                <div className="space-y-3">
                  <p className="text-gray-600">
                    Results are available! Check the Results tab to see if you won.
                  </p>
                  <button
                    onClick={() => onNavigateToResults && onNavigateToResults()}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto"
                  >
                    <CheckCircle className="h-4 w-4" />
                    View Results
                  </button>
                </div>
              ) : (
                <p className="text-gray-600">
                  Waiting for the admin to reveal the correct answer and distribute prizes.
                </p>
              )}
            </div>
          )}

          {transactionId && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Transaction submitted: 
                <a 
                  href={`https://explorer.stacks.co/txid/${transactionId}?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 underline hover:no-underline"
                >
                  View on Explorer
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Educational Content */}
      <div className="card mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          About WordChain
        </h3>
        <p className="text-gray-600">
          WordChain uses a commit-reveal scheme to ensure fairness. The correct answer is 
          cryptographically hashed when the round starts, preventing any manipulation after 
          players have submitted their guesses.
        </p>
      </div>
    </div>
  )
}