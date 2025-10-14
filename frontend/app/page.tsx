"use client"

import { useState, useEffect } from 'react'
import { UserSession, AppConfig, showConnect } from '@stacks/connect'
import { StacksTestnet } from '@stacks/network'
import { autoRevealService } from '../lib/auto-reveal-service'
import { 
  Brain, 
  Trophy, 
  Users, 
  Clock, 
  Coins,
  BookOpen,
  Zap,
  Target,
  Star,
  Sparkles,
  Gamepad2,
  Award,
  TrendingUp,
  Shield,
  Rocket,
  Crown,
  Gem,
  Flame,
  Menu,
  X,
  RefreshCw,
  CheckCircle,
  XCircle,
  Timer
} from 'lucide-react'
import GameInterface from '../components/GameInterface'
import Leaderboard from '../components/Leaderboard'
import PlayerStats from '../components/PlayerStats'
import AdminPanel from '../components/AdminPanel'
import RoundResults from '../components/RoundResults'
import ErrorBoundary from '../components/ErrorBoundary'

const appConfig = new AppConfig(['store_write', 'publish_data'])
const userSession = new UserSession({ appConfig })

export default function WordChainHome() {
  const [isConnected, setIsConnected] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('game')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData)
        setIsConnected(true)
        
        // Initialize auto-reveal service when user signs in
        autoRevealService.setUserSession(userSession)
        autoRevealService.start()
      })
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData())
      setIsConnected(true)
      
      // Initialize auto-reveal service for already signed-in users
      autoRevealService.setUserSession(userSession)
      autoRevealService.start()
    }
    
    // Start auto-reveal service even without user session (for read-only operations)
    autoRevealService.start()
    
    // Cleanup on unmount
    return () => {
      autoRevealService.stop()
    }
  }, [])

  const connectWallet = () => {
    showConnect({
      appDetails: {
        name: 'WordChain',
        icon: '/wordchain-logo.png',
      },
      redirectTo: '/',
      onFinish: () => {
        setIsConnected(true)
        setUserData(userSession.loadUserData())
      },
      userSession,
    })
  }

  const disconnect = () => {
    userSession.signUserOut()
    setIsConnected(false)
    setUserData(null)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <header className="fixed w-full top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg shadow-lg shadow-blue-500/30">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">WordChain</h1>
                <p className="text-xs text-slate-400">Learn • Earn • Compete</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {['game', 'results', 'leaderboard', 'stats', 'admin'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 flex items-center gap-2 ${
                    activeTab === tab
                      ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-lg shadow-blue-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {tab === 'game' && <Gamepad2 className="w-4 h-4" />}
                  {tab === 'results' && <CheckCircle className="w-4 h-4" />}
                  {tab === 'leaderboard' && <Trophy className="w-4 h-4" />}
                  {tab === 'stats' && <TrendingUp className="w-4 h-4" />}
                  {tab === 'admin' && <Shield className="w-4 h-4" />}
                  {tab.charAt(0).toUpperCase() + tab.slice(1).replace(/([A-Z])/g, ' $1')}
                </button>
              ))}
            </nav>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              {isConnected && (
                <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-300">
                      {userData?.profile?.name || 'Anonymous Player'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {userData?.profile?.stxAddress?.testnet?.slice(0, 8)}...
                    </p>
                  </div>
                </div>
              )}
              
              {isConnected ? (
                <button
                  onClick={disconnect}
                  className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors border border-slate-700"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connectWallet}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-blue-500/30 flex items-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  Connect Wallet
                </button>
              )}

              {/* Mobile Menu */}
              <button
                className="md:hidden text-slate-400 hover:text-slate-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-slate-800/50 pt-4">
              <div className="flex flex-col gap-2">
                {['game', 'results', 'leaderboard', 'stats', 'admin'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setActiveTab(tab)
                      setMobileMenuOpen(false)
                    }}
                    className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab
                        ? 'bg-blue-600/20 text-blue-300'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      {!isConnected && (
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          {/* Animated Background Orbs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-1/2 -right-40 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-slate-700/5 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-6xl mx-auto relative z-10">
            {/* Badge */}
            <div className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800/60 border border-slate-700/50 rounded-full backdrop-blur-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm text-slate-300">Now Live on Stacks Testnet</span>
              </div>
            </div>

            {/* Main Title */}
            <div className="text-center mb-12">
              <h1 className="text-6xl md:text-7xl font-black text-white mb-6 leading-tight">
                Master Words,
                <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Earn Rewards
                </span>
              </h1>
              <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed">
                Challenge your vocabulary knowledge while competing with players worldwide. 
                Every correct answer earns you real STX rewards.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <button
                  onClick={connectWallet}
                  className="px-10 py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-lg font-bold text-lg transition-all shadow-xl shadow-blue-500/30 transform hover:scale-105 flex items-center justify-center gap-3"
                >
                  <Rocket className="w-5 h-5" />
                  Start Playing Now
                </button>
                <button className="px-10 py-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-lg transition-colors border border-slate-700">
                  <BookOpen className="w-5 h-5 inline mr-2" />
                  Learn More
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-500" />
                  <span>Smart Contract Verified</span>
                </div>
                <div className="w-1 h-1 bg-slate-600 rounded-full hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span>2,500+ Active Players</span>
                </div>
                <div className="w-1 h-1 bg-slate-600 rounded-full hidden sm:block"></div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Instant Payouts</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
              {[
                { icon: <Trophy className="w-5 h-5" />, label: 'Prize Pool', value: '500 STX' },
                { icon: <Users className="w-5 h-5" />, label: 'Active Players', value: '2,500+' },
                { icon: <Clock className="w-5 h-5" />, label: 'Round Duration', value: '24 Hours' },
                { icon: <Coins className="w-5 h-5" />, label: 'Entry Fee', value: '1 STX' }
              ].map((stat, idx) => (
                <div
                  key={idx}
                  className="p-6 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 rounded-xl backdrop-blur-sm hover:border-slate-600/80 transition-all"
                >
                  <div className="flex items-center gap-2 text-slate-400 mb-3">
                    {stat.icon}
                    <span className="text-sm">{stat.label}</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: <BookOpen className="w-8 h-8" />,
                  title: 'Intelligent Learning',
                  desc: 'AI-powered vocabulary challenges that adapt to your skill level in real-time',
                  color: 'from-blue-600/20 to-blue-500/10'
                },
                {
                  icon: <Coins className="w-8 h-8" />,
                  title: 'Real Rewards',
                  desc: 'Earn STX tokens instantly. Transparent prize distribution with 5% treasury fee',
                  color: 'from-cyan-600/20 to-cyan-500/10'
                },
                {
                  icon: <Trophy className="w-8 h-8" />,
                  title: 'Global Leaderboard',
                  desc: 'Compete with players worldwide. Claim your position on the rankings',
                  color: 'from-amber-600/20 to-amber-500/10'
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className={`p-8 bg-gradient-to-br ${feature.color} border border-slate-700/50 rounded-2xl backdrop-blur-sm hover:border-slate-600/80 transition-all group cursor-pointer`}
                >
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} border border-slate-600/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                    <div className="text-white">{feature.icon}</div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* How It Works */}
            <div className="mt-20">
              <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
              <div className="grid md:grid-cols-4 gap-4">
                {[
                  { num: '1', title: 'Connect', desc: 'Link your Stacks wallet' },
                  { num: '2', title: 'Enter', desc: 'Pay 1 STX entry fee' },
                  { num: '3', title: 'Answer', desc: 'Solve vocabulary questions' },
                  { num: '4', title: 'Win', desc: 'Share the prize pool' }
                ].map((step, idx) => (
                  <div key={idx} className="text-center">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center mx-auto mb-4 text-white font-bold text-xl">
                      {step.num}
                    </div>
                    <h4 className="font-semibold text-white mb-2">{step.title}</h4>
                    <p className="text-sm text-slate-400">{step.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Game Area */}
      {isConnected && (
        <main className="pt-32 pb-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">
                {activeTab === 'game' && 'Play WordChain'}
                {activeTab === 'results' && 'Round Results'}
                {activeTab === 'leaderboard' && 'Global Leaderboard'}
                {activeTab === 'stats' && 'Your Statistics'}
                {activeTab === 'admin' && 'Admin Panel'}
              </h2>
              <p className="text-slate-400">
                {activeTab === 'game' && 'Test your vocabulary skills and earn STX rewards'}
                {activeTab === 'results' && 'View your performance and earnings from recent rounds'}
                {activeTab === 'leaderboard' && 'See how you rank against players worldwide'}
                {activeTab === 'stats' && 'Track your progress and earnings'}
                {activeTab === 'admin' && 'Manage game rounds and settings'}
              </p>
            </div>

            {/* Tab Content */}
            <div className="animate-fade-in-down">
              <ErrorBoundary>
                <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 rounded-2xl backdrop-blur-sm overflow-hidden">
                  {activeTab === 'game' && <GameInterface userSession={userSession} onNavigateToResults={() => setActiveTab('results')} />}
                  {activeTab === 'results' && <RoundResults userSession={userSession} />}
                  {activeTab === 'leaderboard' && <Leaderboard />}
                  {activeTab === 'stats' && <PlayerStats userSession={userSession} />}
                  {activeTab === 'admin' && <AdminPanel userSession={userSession} />}
                </div>
              </ErrorBoundary>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-slate-950/50 backdrop-blur-md py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white">WordChain</h3>
              </div>
              <p className="text-slate-400 mb-4">
                The first learn-to-earn vocabulary game built on Stacks blockchain. 
                Master words while earning real cryptocurrency rewards.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-white text-gray-200 mb-4">Game Details</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Entry: 1 STX
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Round: 24 hours
                </li>
                <li className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-400" />
                  Fee: 5%
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-blue-400 transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">Smart Contract</a></li>
                <li><a href="#" className="hover:text-blue-400 transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800/50 pt-8 text-center text-sm text-slate-500">
            <p>&copy; 2024 WordChain. Built on Stacks blockchain with <span className="text-red-500">❤️</span></p>
          </div>
        </div>
      </footer>
    </div>
  )
}