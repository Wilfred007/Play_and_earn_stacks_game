'use client'

import { useState, useEffect } from 'react'
import { 
  Trophy, 
  Target, 
  Coins, 
  CheckCircle, 
  XCircle,
  Users,
  Clock,
  RefreshCw,
  Award,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { 
  WordChainReader, 
  Round, 
  PlayerGuess,
  microSTXToSTX,
  extractNumericValue
} from '../lib/wordchain-contract'

interface RoundResultsProps {
  userSession: any
}

interface RoundHistoryItem {
  roundId: number
  round: Round | null
  playerGuess: PlayerGuess | null
  won: boolean
  earnings: number
}

export default function RoundResults({ userSession }: RoundResultsProps) {
  const [roundHistory, setRoundHistory] = useState<RoundHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRound, setSelectedRound] = useState<RoundHistoryItem | null>(null)
  const [winners, setWinners] = useState<string[]>([])

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      fetchRoundHistory()
    } else {
      setLoading(false)
    }
  }, [userSession])

  const fetchRoundHistory = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const userData = userSession.loadUserData()
      const playerAddress = userData.profile.stxAddress.testnet
      
      const history = await WordChainReader.getPlayerRoundHistory(playerAddress, 10)
      setRoundHistory(history)
    } catch (err) {
      console.error('Error fetching round history:', err)
      setError('Failed to load round history')
    } finally {
      setLoading(false)
    }
  }

  const fetchRoundWinners = async (roundId: number) => {
    try {
      const roundWinners = await WordChainReader.getRoundWinners(roundId)
      setWinners(roundWinners)
    } catch (error) {
      console.error('Error fetching round winners:', error)
      setWinners([])
    }
  }

  const handleRoundClick = async (roundItem: RoundHistoryItem) => {
    setSelectedRound(roundItem)
    if (roundItem.round && roundItem.round['is-revealed']) {
      await fetchRoundWinners(roundItem.roundId)
    }
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  if (!userSession.isUserSignedIn()) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto p-8 bg-slate-800/60 border border-slate-700/50 rounded-2xl backdrop-blur-sm">
          <Trophy className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Connect Wallet</h3>
          <p className="text-slate-400">
            Connect your wallet to view your round results and history.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto p-8 bg-slate-800/60 border border-slate-700/50 rounded-2xl backdrop-blur-sm">
          <RefreshCw className="h-16 w-16 text-cyan-400 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-white mb-2">Loading Results</h3>
          <p className="text-slate-400">
            Fetching your round history from the blockchain...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto p-8 bg-slate-800/60 border border-slate-700/50 rounded-2xl backdrop-blur-sm">
          <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Error Loading Results</h3>
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={fetchRoundHistory} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (roundHistory.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto p-8 bg-slate-800/60 border border-slate-700/50 rounded-2xl backdrop-blur-sm">
          <Target className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Round History</h3>
          <p className="text-slate-400 mb-4">
            You have not participated in any rounds yet. Start playing to see your results!
          </p>
          <button onClick={fetchRoundHistory} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 mx-auto">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Round Results
            </h2>
            <p className="text-slate-400">
              View your performance and earnings from recent vocabulary challenges
            </p>
          </div>
          <button
            onClick={fetchRoundHistory}
            className="px-6 py-3 bg-slate-700/60 hover:bg-slate-600/60 text-white rounded-lg font-medium transition-colors flex items-center gap-2 border border-slate-600/50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm text-center">
            <Target className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Rounds Played</p>
            <p className="text-2xl font-bold text-white">{roundHistory.length}</p>
          </div>
          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm text-center">
            <CheckCircle className="h-6 w-6 text-green-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Rounds Won</p>
            <p className="text-2xl font-bold text-white">{roundHistory.filter(r => r.won).length}</p>
          </div>
          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm text-center">
            <TrendingUp className="h-6 w-6 text-purple-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Win Rate</p>
            <p className="text-2xl font-bold text-white">
              {roundHistory.length > 0 ? ((roundHistory.filter(r => r.won).length / roundHistory.length) * 100).toFixed(1) : 0}%
            </p>
          </div>
          <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm text-center">
            <Coins className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Total Earned</p>
            <p className="text-2xl font-bold text-white">
              {microSTXToSTX(roundHistory.reduce((sum, r) => sum + r.earnings, 0)).toFixed(2)} STX
            </p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Round History List */}
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-white mb-4">Recent Rounds</h3>
          
          {roundHistory.map((roundItem) => (
            <div
              key={roundItem.roundId}
              onClick={() => handleRoundClick(roundItem)}
              className={`p-6 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm cursor-pointer transition-all hover:bg-slate-700/60 hover:border-slate-600/50 ${
                selectedRound?.roundId === roundItem.roundId ? 'ring-2 ring-cyan-400/50 bg-slate-700/60' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    roundItem.won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {roundItem.won ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">Round #{roundItem.roundId}</h4>
                    <p className="text-sm text-slate-400">
                      {roundItem.round?.['is-revealed'] ? 'Results Available' : 'Pending Results'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  {roundItem.won && roundItem.earnings > 0 && (
                    <div className="flex items-center gap-1 text-green-400 text-sm font-medium">
                      <Coins className="h-4 w-4" />
                      +{microSTXToSTX(roundItem.earnings).toFixed(3)} STX
                    </div>
                  )}
                  <div className={`text-sm font-medium ${
                    roundItem.won ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {roundItem.won ? 'PASSED' : 'FAILED'}
                  </div>
                </div>
              </div>

              {roundItem.round && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Word:</span>
                    <span className="text-white font-medium">{roundItem.round.word}</span>
                  </div>
                  
                  {roundItem.playerGuess && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Your Answer:</span>
                      <span className="text-white">Option {roundItem.playerGuess.option}</span>
                    </div>
                  )}

                  {roundItem.round['is-revealed'] && roundItem.round['correct-option'] && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-400">Correct Answer:</span>
                      <span className="text-green-400 font-medium">Option {roundItem.round['correct-option']}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Round Details Panel */}
        <div className="lg:sticky lg:top-6">
          {selectedRound ? (
            <div className="p-6 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  selectedRound.won ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {selectedRound.won ? <Trophy className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Round #{selectedRound.roundId}</h3>
                  <p className={`text-sm font-medium ${
                    selectedRound.won ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {selectedRound.won ? 'You Passed!' : 'You Failed'}
                  </p>
                </div>
              </div>

              {selectedRound.round && (
                <div className="space-y-6">
                  {/* Word and Definition */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-3">
                      What does <span className="text-cyan-400">{selectedRound.round.word}</span> mean?
                    </h4>
                    
                    {selectedRound.round.options && (
                      <div className="space-y-2">
                        {selectedRound.round.options.map((option, index) => {
                          const optionNumber = index + 1
                          const isPlayerChoice = selectedRound.playerGuess?.option === optionNumber
                          const isCorrect = selectedRound.round?.['correct-option'] === optionNumber
                          
                          return (
                            <div
                              key={index}
                              className={`p-3 rounded-lg border ${
                                isCorrect 
                                  ? 'border-green-400/50 bg-green-500/10' 
                                  : isPlayerChoice 
                                    ? 'border-red-400/50 bg-red-500/10' 
                                    : 'border-slate-600/50 bg-slate-700/30'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isCorrect 
                                    ? 'bg-green-400 text-black' 
                                    : isPlayerChoice 
                                      ? 'bg-red-400 text-white' 
                                      : 'bg-slate-600 text-slate-300'
                                }`}>
                                  {optionNumber}
                                </div>
                                <span className="text-white flex-1">{option}</span>
                                {isCorrect && (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                )}
                                {isPlayerChoice && !isCorrect && (
                                  <XCircle className="h-4 w-4 text-red-400" />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Round Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-400">Total Players</span>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {extractNumericValue(selectedRound.round['participant-count'])}
                      </p>
                    </div>
                    
                    <div className="p-4 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Coins className="h-4 w-4 text-slate-400" />
                        <span className="text-sm text-slate-400">Prize Pool</span>
                      </div>
                      <p className="text-lg font-semibold text-white">
                        {microSTXToSTX(extractNumericValue(selectedRound.round['total-pool'])).toFixed(2)} STX
                      </p>
                    </div>
                  </div>

                  {/* Winners List */}
                  {selectedRound.round['is-revealed'] && winners.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                        <Award className="h-5 w-5 text-yellow-400" />
                        Winners ({winners.length})
                      </h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {winners.map((winner, index) => (
                          <div key={winner} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
                            <span className="text-slate-300 text-sm">{formatAddress(winner)}</span>
                            <div className="flex items-center gap-1 text-green-400 text-xs">
                              <Coins className="h-3 w-3" />
                              {selectedRound.earnings > 0 ? microSTXToSTX(selectedRound.earnings).toFixed(3) : '0.000'} STX
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Your Earnings */}
                  {selectedRound.won && selectedRound.earnings > 0 && (
                    <div className="p-4 bg-green-500/10 border border-green-400/30 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Trophy className="h-5 w-5 text-green-400" />
                        <span className="text-green-400 font-semibold">Your Earnings</span>
                      </div>
                      <p className="text-2xl font-bold text-green-400">
                        +{microSTXToSTX(selectedRound.earnings).toFixed(3)} STX
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 bg-slate-800/60 border border-slate-700/50 rounded-xl backdrop-blur-sm text-center">
              <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Select a Round</h3>
              <p className="text-slate-400">
                Click on any round from the list to view detailed results and winners.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
