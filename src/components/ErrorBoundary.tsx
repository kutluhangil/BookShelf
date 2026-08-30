import React from 'react';
import { clearLibrary } from '../services/localStore';

interface ErrorBoundaryState {
  error: Error | null;
  info: string | null;
}

/**
 * The library now lives in local storage, so a render crash caused by a bad
 * stored record would otherwise repeat on every reload and lock the user out
 * permanently. This surfaces the real error and offers an escape hatch that
 * clears the stored library.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[BookShelf] Unhandled render error:', error, info.componentStack);
    this.setState({ info: info.componentStack ?? null });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetLibrary = () => {
    clearLibrary();
    window.location.reload();
  };

  render(): React.ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="min-h-screen bg-[#12100E] text-[#F4EFE6] flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-[#1C1916] border border-[#A9503F]/50 rounded-2xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[32px] text-[#FF6B6B]">error</span>
            <h1 className="font-serif-literata text-[22px] font-bold">Something broke while rendering</h1>
          </div>

          <p className="font-sans-inter text-[14px] text-[#A79C8C] leading-relaxed">
            The app hit an unrecoverable error. Reloading may be enough. If the error returns every time, a stored
            library record is likely at fault — resetting clears it from this browser. Cloud data is untouched, so a
            signed-in library can be pulled back after signing in again.
          </p>

          <div className="bg-[#12100E] border border-[#3A332A] rounded-xl p-4 space-y-2 max-h-64 overflow-y-auto">
            <p className="font-mono-ibm text-[12px] text-[#FF6B6B] break-words">{error.message}</p>
            {info && (
              <pre className="font-mono-ibm text-[10px] text-[#8C8273] whitespace-pre-wrap break-words">{info.trim()}</pre>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={this.handleReload}
              className="px-4 py-2.5 bg-[#C9963F] text-[#12100E] rounded-xl font-mono-ibm text-[11px] font-bold uppercase tracking-wider"
            >
              Reload
            </button>
            <button
              onClick={this.handleResetLibrary}
              className="px-4 py-2.5 bg-[#3A1D1D] text-[#FF6B6B] rounded-xl font-mono-ibm text-[11px] font-bold uppercase tracking-wider"
            >
              Reset stored library
            </button>
          </div>
        </div>
      </div>
    );
  }
}
