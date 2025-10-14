
import {
  callReadOnlyFunction,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  principalCV,
  stringAsciiCV,
  listCV,
  bufferCV,
  cvToJSON,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
  PostCondition,
  StacksTransaction,
} from '@stacks/transactions'
import { StacksTestnet } from '@stacks/network'
import { UserSession, openContractCall } from '@stacks/connect'

// Contract configuration
export const WORDCHAIN_CONTRACT = {
  address: 'ST18XMCN7PR558WZAE7GPYN16J1SW0BM3WV603Q11',
  name: 'wordchain-v4'
}

export const NETWORK = new StacksTestnet()

// Types
export interface Round {
  word: string
  options: string[]
  'answer-hash': Uint8Array
  'correct-option': number | null
  'start-block': number
  'reveal-block': number
  'total-pool': number
  'participant-count': number
  'is-active': boolean
  'is-revealed': boolean
  creator: string
}
export interface PlayerGuess {
  option: number
  timestamp: number
}

export interface PlayerStats {
  'total-games': number
  'correct-guesses': number
  'total-earned': number
  'win-streak': number
  'best-streak': number
  'last-played': number
}
export interface LeaderboardPlayer {
  address: string
  name?: string
  totalGames: number
  correctGuesses: number
  totalEarned: number
  winStreak: number
  bestStreak: number
  winRate: number
  lastPlayed: number
}

export interface GameConfig {
  'entry-fee': number
  'treasury-fee-percent': number
  'round-duration': number
  'current-round-id': number
  'treasury-balance': number
}

// Utility functions
export const microSTXToSTX = (microSTX: number): number => microSTX / 1000000
export const STXToMicroSTX = (stx: number): number => stx * 1000000

// Read-only functions
export class WordChainReader {
  static async getCurrentRound(): Promise<Round | null> {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'get-current-round',
        functionArgs: [],
        network: NETWORK,
        senderAddress: WORDCHAIN_CONTRACT.address,
      })

      console.log('🔍 Raw getCurrentRound result:', result)
      const data = cvToJSON(result)
      console.log('📊 Parsed getCurrentRound data:', data)
      
      // Handle different optional response formats from Stacks
      if (!data || data.type === 'none' || data.type === '(optional none)' || (data.value === null)) {
        console.log('ℹ️ No active round found - contract returned none/null')
        return null
      }
      
      // Extract the actual value from the optional
      let roundValue = data
      if (data.type === 'some' || data.type === '(optional (some value))') {
        roundValue = data.value
      } else if (data.value) {
        roundValue = data.value
      }
      
      console.log('🔍 Round value after extraction:', roundValue)
      
      if (roundValue) {
        const roundData = extractValue(roundValue)
        console.log('✅ Extracted round data:', roundData)
        
        // Verify we have valid round data
        if (roundData && typeof roundData === 'object' && roundData.word) {
          // Ensure numeric fields are properly converted from Stacks contract response
          const processedRound = {
            ...roundData,
            'start-block': extractNumericValue(roundData['start-block']),
            'reveal-block': extractNumericValue(roundData['reveal-block']),
            'total-pool': extractNumericValue(roundData['total-pool']),
            'participant-count': extractNumericValue(roundData['participant-count']),
            'is-active': extractBooleanValue(roundData['is-active']),
            'is-revealed': extractBooleanValue(roundData['is-revealed'])
          }
          console.log('🔧 Processed round data with proper types:', processedRound)
          
          // Validate the processed data
          if (processedRound['reveal-block'] > 0 && processedRound['start-block'] > 0) {
            return processedRound as Round
          } else {
            console.warn('⚠️ Invalid block numbers in round data:', processedRound)
            return null
          }
        }
      }
      
      return null
    } catch (error) {
      console.error('Error fetching current round:', error)
      return null
    }
  }

  static async getRound(roundId: number): Promise<Round | null> {
    try {
      console.log(`🔍 WordChainReader.getRound: Fetching round ${roundId}`)
      
      const result = await callReadOnlyFunction({
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'get-round',
        functionArgs: [uintCV(roundId)],
        network: NETWORK,
        senderAddress: WORDCHAIN_CONTRACT.address,
      })

      console.log(`🔍 WordChainReader.getRound ${roundId}: Raw result:`, result)
      const data = cvToJSON(result)
      console.log(`📊 WordChainReader.getRound ${roundId}: Parsed data:`, data)
      
      if (!data || data.type === 'none' || data.type === '(optional none)') {
        console.log(`ℹ️ WordChainReader.getRound ${roundId}: Round not found (none type)`)
        return null
      }
      
      if (data.type === 'some' && data.value) {
        const roundData = extractValue(data.value)
        console.log(`✅ WordChainReader.getRound ${roundId}: Extracted round data:`, roundData)
        
        // Validate that we have essential round data
        if (roundData && typeof roundData === 'object' && roundData.word) {
          // Process the round data to ensure proper types
          const processedRound = {
            ...roundData,
            'start-block': extractNumericValue(roundData['start-block']),
            'reveal-block': extractNumericValue(roundData['reveal-block']),
            'total-pool': extractNumericValue(roundData['total-pool']),
            'participant-count': extractNumericValue(roundData['participant-count']),
            'is-active': extractBooleanValue(roundData['is-active']),
            'is-revealed': extractBooleanValue(roundData['is-revealed']),
            'correct-option': roundData['correct-option'] ? extractNumericValue(roundData['correct-option']) : null
          }
          
          console.log(`🔧 WordChainReader.getRound ${roundId}: Processed round:`, processedRound)
          return processedRound as Round
        } else {
          console.warn(`⚠️ WordChainReader.getRound ${roundId}: Invalid round data structure:`, roundData)
          return null
        }
      }
      
      // Handle other possible data formats
      if (data.value) {
        const roundData = extractValue(data.value)
        console.log(`🔄 WordChainReader.getRound ${roundId}: Alternative extraction:`, roundData)
        
        if (roundData && typeof roundData === 'object' && roundData.word) {
          return roundData as Round
        }
      }
      
      console.log(`❌ WordChainReader.getRound ${roundId}: No valid data found`)
      return null
    } catch (error) {
      console.error(`❌ WordChainReader.getRound ${roundId}: Error:`, error)
      return null
    }
  }

  static async getPlayerGuess(roundId: number, playerAddress: string): Promise<PlayerGuess | null> {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'get-player-guess',
        functionArgs: [uintCV(roundId), principalCV(playerAddress)],
        network: NETWORK,
        senderAddress: WORDCHAIN_CONTRACT.address,
      })

      const data = cvToJSON(result)
      if (data && data.value && data.value.value) {
        return extractValue(data.value.value)
      }
      return null
    } catch (error) {
      console.error('Error fetching player guess:', error)
      return null
    }
  }

  static async getPlayerStats(playerAddress: string): Promise<PlayerStats> {
    try {
      console.log('🔍 WordChainReader.getPlayerStats: Fetching stats for:', playerAddress)
      
      const result = await callReadOnlyFunction({
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'get-player-stats',
        functionArgs: [principalCV(playerAddress)],
        network: NETWORK,
        senderAddress: WORDCHAIN_CONTRACT.address,
      })

      console.log('🔍 WordChainReader.getPlayerStats: Raw result:', result)
      const data = cvToJSON(result)
      console.log('📊 WordChainReader.getPlayerStats: Parsed data:', data)
      
      if (data && data.value) {
        const statsData = extractValue(data.value)
        console.log('✅ WordChainReader.getPlayerStats: Extracted stats data:', statsData)
        
        // Validate and process the stats data
        const processedStats = {
          'total-games': extractNumericValue(statsData['total-games'] || 0),
          'correct-guesses': extractNumericValue(statsData['correct-guesses'] || 0),
          'total-earned': extractNumericValue(statsData['total-earned'] || 0),
          'win-streak': extractNumericValue(statsData['win-streak'] || 0),
          'best-streak': extractNumericValue(statsData['best-streak'] || 0),
          'last-played': extractNumericValue(statsData['last-played'] || 0)
        }
        
        console.log('🔧 WordChainReader.getPlayerStats: Processed stats:', processedStats)
        return processedStats
      }
      
      console.log('⚠️ WordChainReader.getPlayerStats: No data found, using default stats')
      return { 
        'total-games': 0, 
        'correct-guesses': 0, 
        'total-earned': 0,
        'win-streak': 0,
        'best-streak': 0,
        'last-played': 0
      }
    } catch (error) {
      console.error('❌ WordChainReader.getPlayerStats: Error fetching player stats:', error)
      return { 
        'total-games': 0, 
        'correct-guesses': 0, 
        'total-earned': 0,
        'win-streak': 0,
        'best-streak': 0,
        'last-played': 0
      }
    }
  }

  static async getRoundPool(roundId: number): Promise<number> {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'get-round-pool',
        functionArgs: [uintCV(roundId)],
        network: NETWORK,
        senderAddress: WORDCHAIN_CONTRACT.address,
      })

      const data = cvToJSON(result)
      if (data && data.value) {
        return extractValue(data.value)
      }
      return 0
    } catch (error) {
      console.error('Error fetching round pool:', error)
      return 0
    }
  }

  static async getRoundWinners(roundId: number): Promise<string[]> {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'get-round-winners',
        functionArgs: [uintCV(roundId)],
        network: NETWORK,
        senderAddress: WORDCHAIN_CONTRACT.address,
      })

      const data = cvToJSON(result)
      if (data && data.value) {
        return extractValue(data.value)
      }
      return []
    } catch (error) {
      console.error('Error fetching round winners:', error)
      return []
    }
  }

  static async getGameConfig(): Promise<GameConfig> {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'get-game-config',
        functionArgs: [],
        network: NETWORK,
        senderAddress: WORDCHAIN_CONTRACT.address,
      })

      console.log('🔍 Raw getGameConfig result:', result)
      const data = cvToJSON(result)
      console.log('📊 Parsed getGameConfig data:', data)
      
      if (data && data.value) {
        const configData = extractValue(data.value)
        console.log('✅ Extracted config data:', configData)
        return configData
      }
      
      console.log('⚠️ Using default config')
      return {
        'entry-fee': 1000000,
        'treasury-fee-percent': 5,
        'round-duration': 144,
        'current-round-id': 0,
        'treasury-balance': 0
      }
    } catch (error) {
      console.error('Error fetching game config:', error)
      return {
        'entry-fee': 1000000,
        'treasury-fee-percent': 5,
        'round-duration': 144,
        'current-round-id': 0,
        'treasury-balance': 0
      }
    }
  }

  static async getRoundParticipants(roundId: number): Promise<string[]> {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'get-round-participants',
        functionArgs: [uintCV(roundId)],
        network: NETWORK,
        senderAddress: WORDCHAIN_CONTRACT.address,
      })

      console.log(`🔍 Raw getRoundParticipants result for round ${roundId}:`, result)
      const data = cvToJSON(result)
      console.log('📊 Parsed getRoundParticipants data:', data)
      
      if (data && Array.isArray(data)) {
        return data.map((participant: any) => extractValue(participant)).filter((p: any) => typeof p === 'string')
      }
      
      if (data && data.value && Array.isArray(data.value)) {
        return data.value.map((participant: any) => extractValue(participant)).filter((p: any) => typeof p === 'string')
      }
      
      return []
    } catch (error) {
      console.error(`Error fetching round participants for round ${roundId}:`, error)
      return []
    }
  }

  // Leaderboard functions
  static async getLeaderboardData(knownPlayers: string[] = []): Promise<LeaderboardPlayer[]> {
    try {
      console.log('🏆 Fetching leaderboard data for players:', knownPlayers)
      
      if (knownPlayers.length === 0) {
        console.log('ℹ️ No known players provided for leaderboard')
        return []
      }

      const playerPromises = knownPlayers.map(async (address) => {
        try {
          const stats = await this.getPlayerStats(address)
          
          // Extract and convert stats safely
          const totalGames = extractNumericValue(stats['total-games'])
          const correctGuesses = extractNumericValue(stats['correct-guesses'])
          const totalEarned = extractNumericValue(stats['total-earned'])
          const winStreak = extractNumericValue(stats['win-streak'])
          const bestStreak = extractNumericValue(stats['best-streak'])
          const lastPlayed = extractNumericValue(stats['last-played'])
          
          const winRate = totalGames > 0 ? (correctGuesses / totalGames) * 100 : 0
          
          return {
            address,
            totalGames,
            correctGuesses,
            totalEarned,
            winStreak,
            bestStreak,
            winRate,
            lastPlayed
          } as LeaderboardPlayer
        } catch (error) {
          console.error(`Error fetching stats for player ${address}:`, error)
          return null
        }
      })

      const results = await Promise.all(playerPromises)
      const validPlayers = results.filter((player): player is LeaderboardPlayer => 
        player !== null && player.totalGames > 0
      )

      // Sort by win rate by default
      validPlayers.sort((a, b) => b.winRate - a.winRate)
      
      console.log('✅ Leaderboard data fetched:', validPlayers)
      return validPlayers
    } catch (error) {
      console.error('Error fetching leaderboard data:', error)
      return []
    }
  }

  static async getTopPlayersByEarnings(knownPlayers: string[], limit: number = 10): Promise<LeaderboardPlayer[]> {
    const players = await this.getLeaderboardData(knownPlayers)
    return players
      .sort((a, b) => b.totalEarned - a.totalEarned)
      .slice(0, limit)
  }

  static async getTopPlayersByWinRate(knownPlayers: string[], limit: number = 10): Promise<LeaderboardPlayer[]> {
    const players = await this.getLeaderboardData(knownPlayers)
    return players
      .filter(p => p.totalGames >= 3) // Only include players with at least 3 games
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, limit)
  }

  static async getActivePlayersFromRecentRounds(roundCount: number = 10): Promise<string[]> {
    try {
      console.log('🔍 Discovering active players from recent rounds...')
      const config = await this.getGameConfig()
      const currentRoundId = config['current-round-id'] || 0
      
      const playerSet = new Set<string>()
      
      // Check recent rounds for participants
      for (let i = Math.max(1, currentRoundId - roundCount); i <= currentRoundId; i++) {
        try {
          const participants = await this.getRoundParticipants(i)
          if (Array.isArray(participants)) {
            participants.forEach(participant => {
              if (typeof participant === 'string' && participant.length > 0) {
                playerSet.add(participant)
              }
            })
          }
        } catch (error) {
          console.warn(`Could not get participants for round ${i}:`, error)
        }
      }
      
      const players = Array.from(playerSet)
      console.log(`✅ Found ${players.length} active players from recent rounds`)
      return players
    } catch (error) {
      console.error('Error discovering active players:', error)
      return []
    }
  }

  static async checkPlayerWonRound(roundId: number, playerAddress: string): Promise<boolean> {
    try {
      const winners = await this.getRoundWinners(roundId)
      return winners.includes(playerAddress)
    } catch (error) {
      console.error(`Error checking if player won round ${roundId}:`, error)
      return false
    }
  }

  static async getPlayerRoundHistory(playerAddress: string, roundCount: number = 20): Promise<Array<{
    roundId: number
    round: Round | null
    playerGuess: PlayerGuess | null
    won: boolean
    earnings: number
  }>> {
    try {
      console.log(`🔍 Fetching round history for player: ${playerAddress}`)
      const config = await this.getGameConfig()
      const currentRoundId = config['current-round-id'] || 0
      
      const history = []
      
      // Check recent rounds where player participated
      for (let i = Math.max(1, currentRoundId - roundCount); i <= currentRoundId; i++) {
        try {
          const participants = await this.getRoundParticipants(i)
          
          if (Array.isArray(participants) && participants.includes(playerAddress)) {
            const [round, playerGuess, won] = await Promise.all([
              this.getRound(i),
              this.getPlayerGuess(i, playerAddress),
              this.checkPlayerWonRound(i, playerAddress)
            ])
            
            // Calculate earnings if player won
            let earnings = 0
            if (won && round && round['is-revealed']) {
              const winners = await this.getRoundWinners(i)
              const winnerCount = winners.length
              if (winnerCount > 0) {
                // Prize is distributed equally among winners (minus treasury fee)
                const treasuryFee = Math.floor(round['total-pool'] * (config['treasury-fee-percent'] || 5) / 100)
                const prizePool = round['total-pool'] - treasuryFee
                earnings = Math.floor(prizePool / winnerCount)
              }
            }
            
            history.push({
              roundId: i,
              round,
              playerGuess,
              won,
              earnings
            })
          }
        } catch (error) {
          console.warn(`Could not get history for round ${i}:`, error)
        }
      }
      
      // Sort by round ID descending (most recent first)
      history.sort((a, b) => b.roundId - a.roundId)
      
      console.log(`✅ Found ${history.length} rounds in player history`)
      return history
    } catch (error) {
      console.error('Error fetching player round history:', error)
      return []
    }
  }
}

// Write functions using openContractCall (Xverse signing)
export class WordChainWriter {
  static async joinRound(
    userSession: UserSession,
    option: number
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      if (!userSession.isUserSignedIn()) {
        return { success: false, error: 'User not signed in' }
      }

      const userData = userSession.loadUserData()
      const config = await WordChainReader.getGameConfig()
      
      const entryFee = BigInt(config['entry-fee'] || 1000000)
      const postConditions: PostCondition[] = [
        makeStandardSTXPostCondition(
          userData.profile.stxAddress.testnet,
          FungibleConditionCode.Equal,
          entryFee
        )
      ]

      await openContractCall({
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'join-round',
        functionArgs: [uintCV(option)],
        network: NETWORK,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        postConditions,
        onFinish: (data) => {
          console.log('✅ Transaction broadcast successfully:', data)
        },
        onCancel: () => {
          console.log('❌ User cancelled the transaction')
        }
      })

      return { success: true, error: 'Check wallet for transaction' }
    } catch (error) {
      console.error('Error joining round:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  static async startRound(
    userSession: UserSession,
    word: string,
    options: string[],
    answerHash: Uint8Array
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      if (!userSession.isUserSignedIn()) {
        return { success: false, error: 'User not signed in' }
      }

      // Validate inputs
      if (!word || word.length === 0 || word.length > 50) {
        return { success: false, error: 'Word must be between 1-50 characters' }
      }
      
      if (!options || options.length !== 4) {
        return { success: false, error: 'Must provide exactly 4 options' }
      }
      
      for (let i = 0; i < options.length; i++) {
        if (!options[i] || options[i].length === 0 || options[i].length > 100) {
          return { success: false, error: `Option ${i + 1} must be between 1-100 characters` }
        }
      }

      if (!answerHash || answerHash.length !== 32) {
        return { success: false, error: 'Answer hash must be 32 bytes (SHA-256)' }
      }

      const userData = userSession.loadUserData()
      
      console.log('🚀 Starting transaction with parameters:', {
        word: word,
        wordLength: word.length,
        options: options,
        optionLengths: options.map(opt => opt.length),
        answerHashLength: answerHash.length,
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        userAddress: userData.profile.stxAddress.testnet
      })
      
      // Create Clarity values
      const wordCV = stringAsciiCV(word)
      const optionsCV = listCV(options.map(opt => stringAsciiCV(opt)))
      const hashCV = bufferCV(answerHash)
      
      console.log('📦 Clarity values created:', {
        wordCV,
        optionsCV,
        hashCV
      })
      console.log('🔗 Network:', NETWORK)

      let txId: string | undefined
      
      const callOptions = {
        contractAddress: WORDCHAIN_CONTRACT.address,
        contractName: WORDCHAIN_CONTRACT.name,
        functionName: 'start-round',
        functionArgs: [wordCV, optionsCV, hashCV],
        network: NETWORK,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        postConditions: [] as PostCondition[],
      }

      console.log('📤 openContractCall options:', callOptions)
      
      return new Promise((resolve) => {
        try {
          console.log('🔔 About to call openContractCall...')
          
          openContractCall({
            contractAddress: callOptions.contractAddress,
            contractName: callOptions.contractName,
            functionName: callOptions.functionName,
            functionArgs: callOptions.functionArgs,
            network: callOptions.network,
            anchorMode: callOptions.anchorMode,
            postConditionMode: callOptions.postConditionMode,
            postConditions: callOptions.postConditions,
            onFinish: (data: any) => {
              console.log('✅ Transaction submitted:', data)
              resolve({ success: true, txId: data.txId })
            },
            onCancel: () => {
              console.log('❌ User cancelled the transaction')
              resolve({ success: false, error: 'User cancelled the transaction' })
            }
          })
          
          console.log('✅ openContractCall initiated')
        } catch (error) {
          console.error('❌ Error calling openContractCall:', error)
          resolve({ success: false, error: error instanceof Error ? error.message : 'Unknown error in openContractCall' })
        }
      })
    } catch (error) {
      console.error('Error starting round:', error)
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('Error stack:', error.stack)
      }
      return { success: false, error: errorMessage }
    }
  }

  static async revealAnswer(
    userSession: UserSession,
    roundId: number,
    correctAnswer: string,
    correctOption: number
  ): Promise<{ success: boolean; txId?: string; error?: string }> {
    try {
      if (!userSession.isUserSignedIn()) {
        return { success: false, error: 'User not signed in' }
      }

      // Validate inputs
      if (!correctAnswer || correctAnswer.length === 0 || correctAnswer.length > 100) {
        return { success: false, error: 'Correct answer must be between 1-100 characters' }
      }

      if (correctOption < 1 || correctOption > 4) {
        return { success: false, error: 'Correct option must be between 1-4' }
      }

      console.log('🚀 Starting reveal transaction with parameters:', {
        roundId: roundId,
        correctAnswer: correctAnswer,
        correctOption: correctOption
      })
      
      // Create Clarity values
      const roundIdCV = uintCV(roundId)
      const answerCV = stringAsciiCV(correctAnswer)
      const optionCV = uintCV(correctOption)
      
      console.log('📦 Clarity values created for reveal')

      let txId: string | undefined

      return new Promise((resolve) => {
        openContractCall({
          contractAddress: WORDCHAIN_CONTRACT.address,
          contractName: WORDCHAIN_CONTRACT.name,
          functionName: 'reveal-answer',
          functionArgs: [roundIdCV, answerCV, optionCV],
          network: NETWORK,
          anchorMode: AnchorMode.Any,
          postConditionMode: PostConditionMode.Allow,
          postConditions: [],
          onFinish: (data) => {
            console.log('✅ Transaction submitted:', data)
            txId = data.txId
            resolve({ success: true, txId: txId })
          },
          onCancel: () => {
            console.log('❌ User cancelled the transaction')
            resolve({ success: false, error: 'User cancelled the transaction' })
          }
        }).catch((error) => {
          console.error('Error in openContractCall:', error)
          resolve({ success: false, error: error instanceof Error ? error.message : 'Unknown error' })
        })
      })
    } catch (error) {
      console.error('Error revealing answer:', error)
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        errorMessage = error.message
        console.error('Error stack:', error.stack)
      }
      return { success: false, error: errorMessage }
    }
  }
}

// Utility functions for string validation
export const isValidAsciiString = (str: string): boolean => {
  return /^[\x00-\x7F]*$/.test(str)
}

export const sanitizeString = (str: string, maxLength: number): string => {
  return str.replace(/[^\x00-\x7F]/g, '').substring(0, maxLength).trim()
}

// Helper functions for extracting specific data types from Stacks contract responses
export const extractNumericValue = (data: any): number => {
  if (typeof data === 'number') return data
  if (typeof data === 'string') return parseInt(data, 10)
  if (typeof data === 'bigint') return Number(data)
  if (typeof data === 'object' && data !== null && 'value' in data) {
    return extractNumericValue(data.value)
  }
  console.warn('⚠️ Could not extract numeric value from:', data)
  return 0
}

export const extractBooleanValue = (data: any): boolean => {
  console.log('🔍 extractBooleanValue input:', data, 'type:', typeof data)
  
  if (typeof data === 'boolean') {
    console.log('✅ extractBooleanValue: Direct boolean:', data)
    return data
  }
  
  if (typeof data === 'string') {
    const result = data.toLowerCase() === 'true'
    console.log('✅ extractBooleanValue: String to boolean:', data, '->', result)
    return result
  }
  
  if (typeof data === 'number') {
    const result = data !== 0
    console.log('✅ extractBooleanValue: Number to boolean:', data, '->', result)
    return result
  }
  
  if (typeof data === 'object' && data !== null && 'value' in data) {
    console.log('🔄 extractBooleanValue: Extracting from nested object:', data.value)
    return extractBooleanValue(data.value)
  }
  
  // Handle Stacks contract boolean format
  if (typeof data === 'object' && data !== null && 'type' in data) {
    if (data.type === 'bool' && 'value' in data) {
      console.log('✅ extractBooleanValue: Stacks bool format:', data.value)
      return data.value === true || data.value === 'true'
    }
  }
  
  console.warn('⚠️ extractBooleanValue: Could not extract boolean value from:', data)
  return false
}

// Utility function to safely extract values from Stacks contract data
export const extractValue = (data: any): any => {
  if (data === null || data === undefined) return data
  
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data
  }
  
  if (typeof data === 'object' && data !== null && data.hasOwnProperty('value')) {
    return extractValue(data.value)
  }
  
  if (Array.isArray(data)) {
    return data.map(item => extractValue(item))
  }
  
  if (typeof data === 'object' && data !== null) {
    if (data.constructor !== Object) {
      return data
    }
    
    const result: any = {}
    for (const [key, value] of Object.entries(data)) {
      if (key === 'constructor' || key === '__proto__') continue
      result[key] = extractValue(value)
    }
    return result
  }
  
  return data
}

// Utility functions for hash generation
export const generateAnswerHash = async (word: string, correctAnswer: string): Promise<Uint8Array> => {
  const encoder = new TextEncoder()
  const combined = word + correctAnswer
  const data = encoder.encode(combined)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hashBuffer)
}

// Contract deployment check
export const checkContractDeployment = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${NETWORK.coreApiUrl}/v2/contracts/interface/${WORDCHAIN_CONTRACT.address}/${WORDCHAIN_CONTRACT.name}`)
    return response.ok
  } catch (error) {
    console.error('Error checking contract deployment:', error)
    return false
  }
}

// Block height utilities
export const getBlockHeight = async (): Promise<number> => {
  try {
    const response = await fetch(`${NETWORK.coreApiUrl}/v2/info`)
    const data = await response.json()
    return data.stacks_tip_height || 0
  } catch (error) {
    console.error('Error fetching block height:', error)
    return 0
  }
}

export const calculateTimeRemaining = (revealBlock: number, currentBlock: number): string => {
  console.log('🕐 calculateTimeRemaining inputs:', { 
    revealBlock, 
    currentBlock, 
    types: { reveal: typeof revealBlock, current: typeof currentBlock },
    rawValues: { revealBlock, currentBlock }
  })
  
  // Handle different data types from Stacks contract responses
  let revealBlockNum: number
  let currentBlockNum: number
  
  // Extract numeric values from Stacks contract format
  if (typeof revealBlock === 'object' && revealBlock !== null && 'value' in revealBlock) {
    revealBlockNum = Number((revealBlock as any).value)
  } else {
    revealBlockNum = Number(revealBlock)
  }
  
  if (typeof currentBlock === 'object' && currentBlock !== null && 'value' in currentBlock) {
    currentBlockNum = Number((currentBlock as any).value)
  } else {
    currentBlockNum = Number(currentBlock)
  }
  
  console.log('🔢 Converted numbers:', { revealBlockNum, currentBlockNum })
  
  if (isNaN(revealBlockNum) || isNaN(currentBlockNum)) {
    console.warn('⚠️ Invalid block numbers after conversion:', { revealBlock, currentBlock, revealBlockNum, currentBlockNum })
    return 'Unknown'
  }
  
  // Check if blocks are reasonable (not negative or extremely large)
  if (revealBlockNum < 0 || currentBlockNum < 0 || revealBlockNum > 10000000 || currentBlockNum > 10000000) {
    console.warn('⚠️ Unreasonable block numbers:', { revealBlockNum, currentBlockNum })
    return 'Invalid'
  }
  
  const blocksRemaining = Math.max(0, revealBlockNum - currentBlockNum)
  
  // Stacks blocks are approximately 10 minutes each on testnet
  const ESTIMATED_BLOCK_TIME_MINUTES = 10
  const minutesRemaining = blocksRemaining * ESTIMATED_BLOCK_TIME_MINUTES
  
  console.log('⏰ Time calculation details:', {
    revealBlockNum,
    currentBlockNum,
    blocksRemaining,
    minutesRemaining,
    isExpired: blocksRemaining === 0
  })
  
  // Handle expired rounds
  if (blocksRemaining === 0) {
    console.log('⚠️ Round has ended - reveal block reached')
    return 'Ended'
  }
  
  if (minutesRemaining === 0) return 'Ending Soon'
  
  const hours = Math.floor(minutesRemaining / 60)
  const minutes = minutesRemaining % 60
  
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}