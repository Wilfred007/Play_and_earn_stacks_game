import { 
  WordChainReader, 
  WordChainWriter, 
  NETWORK, 
  extractNumericValue, 
  extractBooleanValue,
  Round
} from './wordchain-contract'

interface AutoRevealConfig {
  enabled: boolean
  checkIntervalMs: number
  maxRoundsToCheck: number
}

class AutoRevealService {
  private config: AutoRevealConfig = {
    enabled: true,
    checkIntervalMs: 60000, // Check every minute
    maxRoundsToCheck: 20
  }
  
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private userSession: any = null

  constructor() {
    console.log('🤖 AutoRevealService: Initialized')
  }

  setUserSession(userSession: any) {
    this.userSession = userSession
    console.log('🤖 AutoRevealService: User session set')
  }

  start() {
    if (this.isRunning) {
      console.log('🤖 AutoRevealService: Already running')
      return
    }

    console.log('🤖 AutoRevealService: Starting automatic round revelation service')
    this.isRunning = true
    
    // Run immediately
    this.checkExpiredRounds()
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.checkExpiredRounds()
    }, this.config.checkIntervalMs)
  }

  stop() {
    if (!this.isRunning) return
    
    console.log('🤖 AutoRevealService: Stopping service')
    this.isRunning = false
    
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  private async checkExpiredRounds() {
    if (!this.config.enabled) return
    
    try {
      console.log('🤖 AutoRevealService: Checking for expired rounds...')
      
      // Get current block height
      const currentBlock = await this.getCurrentBlockHeight()
      if (currentBlock === 0) {
        console.warn('🤖 AutoRevealService: Could not get current block height')
        return
      }

      // Get game config to find current round ID
      const config = await WordChainReader.getGameConfig()
      const currentRoundId = config['current-round-id'] || 0
      
      if (currentRoundId === 0) {
        console.log('🤖 AutoRevealService: No rounds found')
        return
      }

      // Check recent rounds for expiration
      const startRound = Math.max(1, currentRoundId - this.config.maxRoundsToCheck)
      const expiredRounds: Array<{roundId: number, round: Round}> = []

      for (let i = startRound; i <= currentRoundId; i++) {
        try {
          const round = await WordChainReader.getRound(i)
          if (!round) continue

          const isRevealed = extractBooleanValue(round['is-revealed'])
          const revealBlock = extractNumericValue(round['reveal-block'])
          
          // Check if round has expired but not revealed
          if (!isRevealed && currentBlock >= revealBlock) {
            console.log(`🤖 AutoRevealService: Found expired round ${i} (current: ${currentBlock}, reveal: ${revealBlock})`)
            expiredRounds.push({ roundId: i, round })
          }
        } catch (error) {
          console.warn(`🤖 AutoRevealService: Error checking round ${i}:`, error)
        }
      }

      // Auto-reveal expired rounds
      for (const { roundId, round } of expiredRounds) {
        await this.autoRevealRound(roundId, round)
      }

      if (expiredRounds.length > 0) {
        console.log(`🤖 AutoRevealService: Processed ${expiredRounds.length} expired rounds`)
      }

    } catch (error) {
      console.error('🤖 AutoRevealService: Error in checkExpiredRounds:', error)
    }
  }

  private async autoRevealRound(roundId: number, round: Round) {
    try {
      console.log(`🤖 AutoRevealService: Auto-revealing round ${roundId}`)
      
      // Determine the correct answer using various strategies
      const correctAnswer = await this.determineCorrectAnswer(roundId, round)
      
      if (!correctAnswer) {
        console.warn(`🤖 AutoRevealService: Could not determine correct answer for round ${roundId}`)
        return
      }

      console.log(`🤖 AutoRevealService: Revealing round ${roundId} with answer: "${correctAnswer.answer}" (option ${correctAnswer.optionNumber})`)

      // Only reveal if we have a user session (admin)
      if (!this.userSession || !this.userSession.isUserSignedIn()) {
        console.warn('🤖 AutoRevealService: No admin user session available for revelation')
        return
      }

      // Call the reveal function
      const result = await WordChainWriter.revealAnswer(
        this.userSession,
        roundId,
        correctAnswer.answer,
        correctAnswer.optionNumber
      )

      if (result.success) {
        console.log(`✅ AutoRevealService: Successfully auto-revealed round ${roundId}`)
      } else {
        console.error(`❌ AutoRevealService: Failed to auto-reveal round ${roundId}:`, result.error)
      }

    } catch (error) {
      console.error(`❌ AutoRevealService: Error auto-revealing round ${roundId}:`, error)
    }
  }

  private async determineCorrectAnswer(roundId: number, round: Round): Promise<{answer: string, optionNumber: number} | null> {
    try {
      // Strategy 1: Check if there's a stored correct answer (from round creation)
      const storedAnswer = this.getStoredCorrectAnswer(roundId)
      if (storedAnswer) {
        console.log(`🎯 AutoRevealService: Using stored answer for round ${roundId}`)
        return storedAnswer
      }

      // Strategy 2: Analyze player guesses to find most popular answer
      const popularAnswer = await this.getMostPopularAnswer(roundId, round)
      if (popularAnswer) {
        console.log(`📊 AutoRevealService: Using most popular answer for round ${roundId}`)
        return popularAnswer
      }

      // Strategy 3: Use first option as fallback (could be enhanced with AI/ML)
      console.log(`🔄 AutoRevealService: Using fallback (option 1) for round ${roundId}`)
      return {
        answer: round.options[0],
        optionNumber: 1
      }

    } catch (error) {
      console.error(`❌ AutoRevealService: Error determining correct answer for round ${roundId}:`, error)
      return null
    }
  }

  private getStoredCorrectAnswer(roundId: number): {answer: string, optionNumber: number} | null {
    try {
      // Check localStorage for stored correct answers
      const stored = localStorage.getItem(`wordchain_round_${roundId}_correct`)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.warn('🤖 AutoRevealService: Error reading stored answer:', error)
    }
    return null
  }

  private async getMostPopularAnswer(roundId: number, round: Round): Promise<{answer: string, optionNumber: number} | null> {
    try {
      // Get all participants for this round
      const participants = await WordChainReader.getRoundParticipants(roundId)
      if (!participants || participants.length === 0) {
        return null
      }

      // Count votes for each option
      const voteCounts = [0, 0, 0, 0] // options 1-4
      
      for (const participant of participants) {
        try {
          const guess = await WordChainReader.getPlayerGuess(roundId, participant)
          if (guess && guess.option >= 1 && guess.option <= 4) {
            voteCounts[guess.option - 1]++
          }
        } catch (error) {
          console.warn(`🤖 AutoRevealService: Error getting guess for ${participant}:`, error)
        }
      }

      // Find the most voted option
      const maxVotes = Math.max(...voteCounts)
      const mostVotedIndex = voteCounts.indexOf(maxVotes)
      
      if (maxVotes > 0) {
        return {
          answer: round.options[mostVotedIndex],
          optionNumber: mostVotedIndex + 1
        }
      }

    } catch (error) {
      console.error('🤖 AutoRevealService: Error analyzing popular answer:', error)
    }
    
    return null
  }

  private async getCurrentBlockHeight(): Promise<number> {
    try {
      const response = await fetch(`${NETWORK.coreApiUrl}/v2/info`)
      const data = await response.json()
      return data.stacks_tip_height || 0
    } catch (error) {
      console.error('🤖 AutoRevealService: Error fetching block height:', error)
      return 0
    }
  }

  // Public method to store correct answer when creating rounds
  storeCorrectAnswer(roundId: number, answer: string, optionNumber: number) {
    try {
      const data = { answer, optionNumber }
      localStorage.setItem(`wordchain_round_${roundId}_correct`, JSON.stringify(data))
      console.log(`💾 AutoRevealService: Stored correct answer for round ${roundId}`)
    } catch (error) {
      console.warn('🤖 AutoRevealService: Error storing correct answer:', error)
    }
  }
}

// Export singleton instance
export const autoRevealService = new AutoRevealService()
export default autoRevealService
