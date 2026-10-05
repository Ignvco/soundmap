// Error Boundary — SoundMap
// Catches render errors so a crash in one screen doesn't tumble the whole app.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production, wire this to Sentry / Convex logging.
    console.error("[SoundMap] Uncaught error:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl bg-card border border-border p-6 shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-11 w-11 rounded-2xl bg-destructive/15 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-destructive" />
            </div>
            <div>
              <p className="text-base font-medium text-foreground">Ha ocurrido un error</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">La app se recuperó, pero esta pantalla no cargó.</p>
            </div>
          </div>
          {this.state.error && (
            <pre className="text-[10px] text-muted-foreground bg-secondary rounded-xl border border-border p-3 mb-4 overflow-auto max-h-32">
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            data-testid="error-reset-btn"
            className="w-full flex items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-bold text-accent-foreground hover:bg-[#00D95A] active:scale-[0.98] transition-all cursor-pointer shadow-[0_6px_20px_rgba(0,255,102,0.30)]"
          >
            <RotateCcw size={14} /> Volver al Inicio
          </button>
        </div>
      </div>
    );
  }
}
