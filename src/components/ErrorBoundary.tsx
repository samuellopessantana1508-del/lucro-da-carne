"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FFEBEE] flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-[#B23A3A]" />
          </div>
          <h2 className="text-lg font-semibold text-[#4A0F14] mb-2">Algo deu errado</h2>
          <p className="text-sm text-[#8A8178] max-w-sm mb-6">
            Ocorreu um erro inesperado. Tente recarregar a página.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="btn-primary"
          >
            <RefreshCw className="w-4 h-4" />
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
