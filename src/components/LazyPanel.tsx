import React, { Suspense } from 'react';

interface LazyPanelState {
  error: Error | null;
}

/**
 * Suspense plus an error boundary for a lazily loaded dashboard panel.
 *
 * A chunk that fails to load — offline, or after a deploy replaced the file —
 * throws during render, and without a boundary a single missing chart takes the
 * whole app down with it.
 */
class PanelBoundary extends React.Component<{ children: React.ReactNode; label: string }, LazyPanelState> {
  state: LazyPanelState = { error: null };

  static getDerivedStateFromError(error: Error): LazyPanelState {
    return { error };
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;

    return (
      <div className="bg-[#1C1916] border border-[#3A332A] rounded-2xl p-6 min-h-[180px] flex flex-col items-center justify-center gap-3 text-center">
        <span className="material-symbols-outlined text-[28px] text-[#C97A3F]">wifi_off</span>
        <p className="font-sans-inter text-[13px] text-[#A79C8C] max-w-[240px]">
          {this.props.label} could not load. It needs a connection the first time it is opened.
        </p>
        <button
          onClick={this.handleRetry}
          className="px-3 py-1.5 bg-[#262119] hairline-border rounded-lg font-mono-ibm text-[10px] text-[#C9963F] uppercase tracking-wider"
        >
          Retry
        </button>
      </div>
    );
  }
}

const Skeleton: React.FC = () => (
  <div className="bg-[#1C1916] border border-[#3A332A] rounded-2xl p-6 min-h-[180px] flex items-center justify-center">
    <div className="w-6 h-6 border-2 border-[#C9963F]/20 border-t-[#C9963F] rounded-full animate-spin" />
  </div>
);

export const LazyPanel: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <PanelBoundary label={label}>
    <Suspense fallback={<Skeleton />}>{children}</Suspense>
  </PanelBoundary>
);
