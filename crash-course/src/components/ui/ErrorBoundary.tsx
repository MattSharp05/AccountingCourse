import { Component, type ReactNode, type ErrorInfo } from 'react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[200px] flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-6xl mb-4">😵</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 font-display">
              Oops! Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              Don't worry, your progress is saved. Try refreshing or click the button below.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Technical details
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded-lg text-xs overflow-auto max-h-32 text-error-600">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <Button onClick={this.handleRetry} variant="primary">
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for 3D canvas
export class Canvas3DErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('3D Canvas error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload(); // Full reload for WebGL context issues
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[400px] bg-game-bg flex items-center justify-center">
          <div className="text-center text-white p-8">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-xl font-bold mb-2 font-display">
              3D Scene Error
            </h2>
            <p className="text-gray-300 mb-4 max-w-sm">
              There was a problem loading the 3D environment. This could be due to
              browser compatibility or graphics settings.
            </p>
            <div className="space-y-2">
              <Button onClick={this.handleRetry} variant="primary">
                Reload Scene
              </Button>
              <p className="text-xs text-gray-500">
                Try using Chrome or Firefox for best compatibility
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
