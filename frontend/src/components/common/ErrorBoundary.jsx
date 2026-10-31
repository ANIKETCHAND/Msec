import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[350px] p-6 flex items-center justify-center bg-[#F5F6F8]">
          <div className="max-w-md w-full bg-white rounded-xl border border-rose-200 p-6 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-semibold text-[#171717]">
                {this.props.title || 'Workspace View Exception'}
              </h2>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                {this.state.error?.message || 'An unexpected rendering error occurred in this workspace component.'}
              </p>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
              <pre className="text-[10px] text-left font-mono bg-neutral-900 text-rose-300 p-3 rounded overflow-x-auto max-h-36">
                {this.state.error?.stack}
              </pre>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-3.5 py-1.5 rounded-md bg-[#1677FF] hover:bg-[#0958D9] text-white text-xs font-medium flex items-center gap-1.5 transition-swiss cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry View</span>
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="px-3.5 py-1.5 rounded-md border border-[#E5E7EB] hover:bg-[#F9FAFB] text-[#171717] text-xs font-medium flex items-center gap-1.5 transition-swiss cursor-pointer"
              >
                <Home className="w-3.5 h-3.5 text-[#6B7280]" />
                <span>Reload Page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
