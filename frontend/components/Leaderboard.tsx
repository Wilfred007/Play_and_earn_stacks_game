'use client'

import { useState, useEffect } from 'react'
import { Trophy, Medal, Award, TrendingUp, Users, Coins, RefreshCw, AlertCircle } from 'lucide-react'
import { 
  WordChainReader, 
  LeaderboardPlayer,
  microSTXToSTX 
} from '../lib/wordchain-contract'

interface PlayerStats {
  address: string
  name?: string
  totalGames: number
  correctGuesses: number
  totalEarned: number
  winRate: number
  rank: number
}

export default function Leaderboard() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'winRate' | 'totalEarned' | 'correctGuesses'>('winRate')

  useEffect(() => {
    fetchLeaderboardData()
  }, [])

  const fetchLeaderboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🏆 Starting leaderboard data fetch...')
      
      // First, discover active players from recent rounds
      const activePlayerAddresses = await WordChainReader.getActivePlayersFromRecentRounds(20)
      console.log('👥 Found active players:', activePlayerAddresses)
      
      if (activePlayerAddresses.length === 0) {
        console.log('ℹ️ No active players found')
        setPlayers([])
        setLoading(false)
        return
      }
      
      // Fetch leaderboard data for discovered players
      const leaderboardData = await WordChainReader.getLeaderboardData(activePlayerAddresses)
      console.log('📊 Leaderboard data:', leaderboardData)
      
      setPlayers(leaderboardData)
    } catch (err) {
      console.error('Error fetching leaderboard data:', err)
      setError('Failed to load leaderboard data')
    } finally {
      setLoading(false)
    }
  }

  const sortedPlayers = [...players].sort((a, b) => {
    switch (sortBy) {
      case 'winRate':
        return b.winRate - a.winRate
      case 'totalEarned':
        return b.totalEarned - a.totalEarned
      case 'correctGuesses':
        return b.correctGuesses - a.correctGuesses
      default:
        return b.winRate - a.winRate // Default to win rate
    }
  }).map((player, index) => ({ ...player, rank: index + 1 }))

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">{rank}</div>
    }
  }

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
      case 2:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
      case 3:
        return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="card max-w-md mx-auto">
            <RefreshCw className="h-16 w-16 text-primary-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Loading Leaderboard</h3>
            <p className="text-gray-600">
              Fetching player statistics from the blockchain...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="card max-w-md mx-auto">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Leaderboard</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={fetchLeaderboardData} className="btn-primary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (players.length === 0) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="card max-w-md mx-auto">
            <Trophy className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Players Yet</h3>
            <p className="text-gray-600 mb-4">
              No players have participated in recent rounds. Be the first to join a WordChain challenge!
            </p>
            <button onClick={fetchLeaderboardData} className="btn-secondary">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center space-x-4 mb-4">
          <h2 className="text-3xl font-bold gradient-text">Leaderboard</h2>
          <button
            onClick={fetchLeaderboardData}
            className="btn-secondary"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <p className="text-gray-600">Top vocabulary champions on WordChain</p>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card text-center">
          <Users className="h-8 w-8 text-primary-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Total Players</p>
          <p className="text-2xl font-bold text-gray-200">{players.length}</p>
        </div>
        
        <div className="card text-center">
          <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Games Played</p>
          <p className="text-2xl font-bold text-gray-200">
            {players.reduce((sum, p) => sum + p.totalGames, 0)}
          </p>
        </div>
        
        <div className="card text-center">
          <Coins className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Total Rewards</p>
          <p className="text-2xl font-bold text-gray-200">
            {microSTXToSTX(players.reduce((sum, p) => sum + p.totalEarned, 0)).toFixed(2)} STX
          </p>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 mr-4">Sort by:</span>
          {[
            { key: 'winRate', label: 'Win Rate' },
            { key: 'totalEarned', label: 'Total Earned' },
            { key: 'correctGuesses', label: 'Correct Guesses' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key as any)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                sortBy === key
                  ? 'bg-primary-100 text-primary-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card">
        <div className="space-y-4">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.address}
              className={`flex items-center space-x-4 p-4 rounded-lg transition-all hover:bg-gray-50 ${
                index < 3 ? 'bg-gradient-to-r from-gray-50 to-transparent' : ''
              }`}
            >
              {/* Rank */}
              <div className="flex-shrink-0">
                {getRankIcon(player.rank)}
              </div>

              {/* Player Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {player.name || `Player ${player.address.slice(-4)}`}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRankBadge(player.rank)}`}>
                    #{player.rank}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {player.address.slice(0, 8)}...{player.address.slice(-8)}
                </p>
              </div>

              {/* Stats */}
              <div className="flex-shrink-0 text-right">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-900">{player.winRate.toFixed(1)}%</p>
                    <p className="text-gray-500">Win Rate</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{microSTXToSTX(player.totalEarned).toFixed(2)}</p>
                    <p className="text-gray-500">STX Earned</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{player.correctGuesses}/{player.totalGames}</p>
                    <p className="text-gray-500">W/L</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievement Badges */}
      <div className="card mt-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🏆 Achievement Badges</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg">
            <Trophy className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="font-semibold text-yellow-800">Vocabulary Master</p>
              <p className="text-sm text-yellow-600">Achieve 80%+ win rate</p>
              <p className="text-xs text-yellow-500">
                {players.filter(p => p.winRate >= 80).length} players achieved
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
            <Medal className="h-8 w-8 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-800">Word Scholar</p>
              <p className="text-sm text-blue-600">Earn 5+ STX total</p>
              <p className="text-xs text-blue-500">
                {players.filter(p => microSTXToSTX(p.totalEarned) >= 5).length} players achieved
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
            <Award className="h-8 w-8 text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Consistent Learner</p>
              <p className="text-sm text-green-600">Play 10+ rounds</p>
              <p className="text-xs text-green-500">
                {players.filter(p => p.totalGames >= 10).length} players achieved
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
