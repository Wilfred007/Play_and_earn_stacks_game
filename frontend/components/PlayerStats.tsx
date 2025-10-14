'use client'

import { useState, useEffect } from 'react'
import { 
  TrendingUp, 
  Target, 
  Coins, 
  Award,
  BarChart3,
  Trophy,
  RefreshCw,
  User
} from 'lucide-react'
import { 
  WordChainReader, 
  PlayerStats as ContractPlayerStats,
  microSTXToSTX,
  extractValue
} from '../lib/wordchain-contract'

interface PlayerStatsProps {
  userSession: any
}

interface PlayerData {
  totalGames: number
  correctGuesses: number
  totalEarned: number
  winRate: number
  averageEarnings: number
}

export default function PlayerStats({ userSession }: PlayerStatsProps) {
  const [playerData, setPlayerData] = useState<PlayerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      fetchPlayerStats()
    } else {
      setLoading(false)
    }
  }, [userSession])

  const fetchPlayerStats = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const userData = userSession.loadUserData()
      const playerAddress = userData.profile.stxAddress.testnet
      
      console.log('🔍 PlayerStats: Fetching stats for address:', playerAddress)
      
      const contractStats = await WordChainReader.getPlayerStats(playerAddress)
      console.log('📊 PlayerStats: Raw contract stats:', contractStats)
      
      // Extract values from contract response safely
      const totalGames = (() => {
        const value = extractValue(contractStats['total-games'])
        console.log('🎯 PlayerStats: total-games raw value:', contractStats['total-games'], 'extracted:', value)
        return typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value, 10) || 0 : 0)
      })()
      
      const correctGuesses = (() => {
        const value = extractValue(contractStats['correct-guesses'])
        console.log('✅ PlayerStats: correct-guesses raw value:', contractStats['correct-guesses'], 'extracted:', value)
        return typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value, 10) || 0 : 0)
      })()
      
      const totalEarned = (() => {
        const value = extractValue(contractStats['total-earned'])
        console.log('💰 PlayerStats: total-earned raw value:', contractStats['total-earned'], 'extracted:', value)
        return typeof value === 'number' ? value : (typeof value === 'string' ? parseInt(value, 10) || 0 : 0)
      })()
      
      console.log('🔢 PlayerStats: Processed values:', {
        totalGames,
        correctGuesses,
        totalEarned,
        totalEarnedSTX: microSTXToSTX(totalEarned)
      })
      
      const playerData: PlayerData = {
        totalGames,
        correctGuesses,
        totalEarned,
        winRate: totalGames > 0 ? Math.round((correctGuesses / totalGames) * 100 * 10) / 10 : 0,
        averageEarnings: totalGames > 0 ? Math.round((totalEarned / totalGames) * 1000) / 1000 : 0
      }
      
      console.log('📋 PlayerStats: Final player data:', playerData)
      
      // Also fetch player's round history to cross-check the stats
      console.log('🔍 PlayerStats: Fetching round history for verification...')
      try {
        const roundHistory = await WordChainReader.getPlayerRoundHistory(playerAddress, 20)
        console.log('📊 PlayerStats: Round history:', roundHistory)
        
        // Calculate stats from round history for comparison
        const historyStats = {
          totalGames: roundHistory.length,
          correctGuesses: roundHistory.filter(r => r.won).length,
          totalEarnings: roundHistory.reduce((sum, r) => sum + r.earnings, 0)
        }
        
        console.log('🔍 PlayerStats: Stats from round history:', historyStats)
        console.log('⚖️ PlayerStats: Contract vs History comparison:', {
          contract: { totalGames, correctGuesses, totalEarned },
          history: historyStats,
          match: {
            games: totalGames === historyStats.totalGames,
            correct: correctGuesses === historyStats.correctGuesses,
            earnings: totalEarned === historyStats.totalEarnings
          }
        })
      } catch (historyError) {
        console.warn('⚠️ PlayerStats: Could not fetch round history:', historyError)
      }
      
      setPlayerData(playerData)
    } catch (err) {
      console.error('❌ PlayerStats: Error fetching player stats:', err)
      setError('Failed to load player statistics')
    } finally {
      setLoading(false)
    }
  }

  if (!userSession.isUserSignedIn()) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Connect Wallet</h3>
          <p className="text-gray-600">
            Connect your wallet to view your WordChain statistics and progress.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <RefreshCw className="h-16 w-16 text-primary-500 mx-auto mb-4 animate-spin" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Stats</h3>
          <p className="text-gray-600">
            Fetching your WordChain statistics from the blockchain...
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <Trophy className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Stats</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchPlayerStats} className="btn-primary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!playerData || playerData.totalGames === 0) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Games Played Yet</h3>
          <p className="text-gray-600 mb-4">
            Start playing WordChain to see your statistics and track your progress!
          </p>
          <button onClick={fetchPlayerStats} className="btn-secondary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="card mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-200 mb-2">Your WordChain Stats</h2>
            <p className="text-gray-600">
              Track your vocabulary learning progress and earnings
            </p>
          </div>
          <button
            onClick={fetchPlayerStats}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card text-center">
          <BarChart3 className="h-8 w-8 text-primary-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Total Games</p>
          <p className="text-3xl font-bold text-gray-200">{playerData.totalGames}</p>
        </div>
        
        <div className="card text-center">
          <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Correct Answers</p>
          <p className="text-3xl font-bold text-gray-200">{playerData.correctGuesses}</p>
        </div>
        
        <div className="card text-center">
          <TrendingUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Win Rate</p>
          <p className="text-3xl font-bold text-gray-200">{typeof playerData.winRate === 'number' && !isNaN(playerData.winRate) ? playerData.winRate.toFixed(1) : '0.0'}%</p>
        </div>
        
        <div className="card text-center">
          <Coins className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-sm text-gray-400">Total Earned</p>
          <p className="text-3xl font-bold text-gray-200">{(() => {
            const stxAmount = microSTXToSTX(typeof playerData.totalEarned === 'number' ? playerData.totalEarned : 0)
            return typeof stxAmount === 'number' ? stxAmount.toFixed(2) : '0.00'
          })()} STX</p>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Performance Overview */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-200 mb-6">Performance Overview</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Award className="h-5 w-5 text-primary-600" />
                <span className="text-gray-200">Average Earnings per Game</span>
              </div>
              <span className="font-semibold text-gray-200">
                {(() => {
                  const stxAmount = microSTXToSTX(typeof playerData.averageEarnings === 'number' ? playerData.averageEarnings : 0)
                  return typeof stxAmount === 'number' ? stxAmount.toFixed(3) : '0.000'
                })()} STX
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <span className="text-gray-200">Success Rate</span>
              </div>
              <span className="font-semibold text-gray-200">{typeof playerData.winRate === 'number' && !isNaN(playerData.winRate) ? playerData.winRate.toFixed(1) : '0.0'}%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Target className="h-5 w-5 text-green-600" />
                <span className="text-gray-200">Wrong Answers</span>
              </div>
              <span className="font-semibold text-gray-200">
                {playerData.totalGames - playerData.correctGuesses}
              </span>
            </div>
          </div>
        </div>

        {/* Learning Progress */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-200 mb-6">Learning Progress</h3>
          
          <div className="space-y-6">
            {/* Win Rate Progress Bar */}
            <div>
              <div className="flex justify-between text-sm text-gray-200 mb-2">
                <span>Accuracy Rate</span>
                <span>{typeof playerData.winRate === 'number' && !isNaN(playerData.winRate) ? playerData.winRate.toFixed(1) : '0.0'}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-primary-500 to-secondary-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(typeof playerData.winRate === 'number' && !isNaN(playerData.winRate) ? playerData.winRate : 0, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Earnings Progress */}
            <div>
              <div className="flex justify-between text-sm text-gray-200 mb-2">
                <span>Total Earnings</span>
                <span>{(() => {
                  const stxAmount = microSTXToSTX(typeof playerData.totalEarned === 'number' ? playerData.totalEarned : 0)
                  return typeof stxAmount === 'number' ? stxAmount.toFixed(2) : '0.00'
                })()} STX</span>
              </div>
              <div className="text-xs text-gray-200">
                Keep playing to increase your vocabulary and earnings!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Achievements Section */}
      <div className="card mt-8">
        <h3 className="text-lg font-semibold text-gray-200 mb-6">Achievements</h3>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-lg border-2 ${
            playerData.totalGames >= 1 
              ? 'border-green-200 bg-green-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                playerData.totalGames >= 1 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <Trophy className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">First Steps</h4>
                <p className="text-sm text-gray-600">Play your first game</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            playerData.totalGames >= 10 
              ? 'border-blue-200 bg-blue-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                playerData.totalGames >= 10 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Dedicated Learner</h4>
                <p className="text-sm text-gray-600">Play 10 games</p>
              </div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border-2 ${
            playerData.winRate >= 70 
              ? 'border-purple-200 bg-purple-50' 
              : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                playerData.winRate >= 70 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Word Master</h4>
                <p className="text-sm text-gray-600">Achieve 70% win rate</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
