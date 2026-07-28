import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from './Button'

interface State {
  hasError: boolean
  message?: string
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-bg flex min-h-screen items-center justify-center p-6">
          <div className="card-panel max-w-md text-center">
            <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">
              {this.state.message || 'An unexpected error occurred.'}
            </p>
            <Button className="mt-6" onClick={() => window.location.assign('/')}>
              Go Home
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
