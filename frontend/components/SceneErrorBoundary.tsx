import React, { type ReactNode } from "react";

interface Props {
  fallback?: ReactNode;
  children: ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
}

export default class SceneErrorBoundary extends React.Component<Props, State> {
  public state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (this.props.onError) {
      this.props.onError(error, info);
    } else {
      console.error("Scene rendering failed:", error, info);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex h-full w-full items-center justify-center rounded-lg bg-slate-900/70 p-6 text-center text-sm text-slate-200">
            Something went wrong while rendering this scene.
          </div>
        )
      );
    }
    return this.props.children;
  }
}
