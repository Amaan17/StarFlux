import React from 'react';

type Props = { children: React.ReactNode };
type State = { hasError: boolean; message?: string };

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('Tool crashed:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="panel">
          <h3>Something went wrong</h3>
          <div style={{ color: '#93a4c0', marginBottom: 8 }}>{this.state.message}</div>
          <div className="row">
            <button onClick={() => this.setState({ hasError: false, message: undefined })}>Dismiss</button>
            <button className="primary" onClick={() => window.location.reload()}>Reload App</button>
          </div>
        </div>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

