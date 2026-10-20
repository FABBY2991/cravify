"use client";

import { Component, type ReactNode } from "react";

/** Shows a calm, recoverable message instead of a blank page when a live query fails. */
export class ErrorBoundary extends Component<{ children: ReactNode; title?: string }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="grid min-h-[60svh] place-items-center bg-cream px-6 text-center">
        <div className="max-w-md">
          <p className="font-display text-5xl uppercase">{this.props.title ?? "Something went wrong"}</p>
          <p className="mt-3 text-muted">We couldn&apos;t load this just now. Check your connection, then try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-full bg-ink px-6 py-3 font-bold text-white hover:bg-brand"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }
}
