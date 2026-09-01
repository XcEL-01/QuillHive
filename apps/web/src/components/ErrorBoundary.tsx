import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}
interface State {
  hasError: boolean;
  error: Error | null;
}

function diagnosticMessage(error: Error | null): string {
  if (!error) return "Unknown client error";
  const message = `${error.name || "Error"}: ${error.message || "Unknown error"}`
    .replace(/Bearer\s+[\w.-]+/gi, "Bearer [redacted]")
    .replace(/https?:\/\/[^\s)]+/gi, "[url redacted]")
    .replace(/\b(?:token|password|secret|authorization)\s*[:=]\s*[^,;\s]+/gi, "$1: [redacted]")
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email redacted]")
    .replace(/\s+/g, " ")
    .trim();
  return message.length > 240 ? `${message.slice(0, 237)}...` : message;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error("[ErrorBoundary] Unhandled render error", {
      name: error.name,
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground mt-1">
              This page hit an error. Your data is safe.
            </p>
            <pre className="mt-3 text-left text-xs bg-muted p-3 rounded-lg overflow-auto max-h-32 text-destructive">
              {diagnosticMessage(this.state.error)}
            </pre>
          </div>
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition">
            <RotateCcw className="w-4 h-4" />
            Reload page
          </button>
        </div>
      </div>
    );
  }
}