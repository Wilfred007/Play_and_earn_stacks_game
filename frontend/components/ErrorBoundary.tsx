'use client'

import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
    
    // Check if it's the object rendering error
    if (error.message.includes('Objects are not valid as a React child')) {
      console.error('React object rendering error detected!')
      console.error('Error stack:', error.stack)
      console.error('Component stack:', errorInfo.componentStack)
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="card max-w-md mx-auto text-center">
            <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message.includes('Objects are not valid as a React child') 
                ? 'There was an issue rendering contract data. This usually happens when contract responses contain objects instead of primitive values.'
                : 'An unexpected error occurred while loading the application.'
              }
            </p>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-left text-gray-500 mb-4 p-3 bg-gray-100 rounded overflow-auto max-h-32">
                <p className="font-semibold mb-1">Error Details:</p>
                <p>{this.state.error?.message}</p>
                {this.state.error?.stack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Stack Trace</summary>
                    <pre className="mt-1 text-xs">{this.state.error.stack}</pre>
                  </details>
                )}
              </div>
            )}
            
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined })
                window.location.reload()
              }}
              className="btn-primary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Application
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
