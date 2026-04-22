import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error detected by WifiGuard Boundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-[#0F1115] text-[#E0E0E0] p-10 font-sans flex items-center justify-center">
          <div className="max-w-xl w-full p-8 border border-red-500/30 bg-red-500/5 rounded-2xl">
            <h1 className="font-serif italic text-3xl text-red-500 mb-4 font-bold">Protocol Failure Detected</h1>
            <p className="text-white/60 mb-6 text-sm leading-relaxed">
              L'applicazione ha riscontrato un errore imprevisto. Questo può accadere se il sistema operativo o il browser bloccano determinate funzioni di rete.
            </p>
            <div className="bg-black/60 p-4 rounded-lg border border-white/5 font-mono text-[10px] text-red-400 mb-8 overflow-auto max-h-48 whitespace-pre-wrap">
              {this.state.error?.stack || this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-4 bg-white text-black font-black uppercase text-xs tracking-widest rounded-lg hover:bg-red-500 hover:text-white transition-all shadow-xl"
            >
              Restart System Interface
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
