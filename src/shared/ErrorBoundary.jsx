import React from 'react';
import IconButton from './IconButton';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  handleRetry() {
    this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="errorBoundary">
          <AlertTriangle className="emptyIcon" aria-hidden="true" size={40} />
          <h2>Wystąpił błąd</h2>
          <p>{this.state.error.message}</p>
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <IconButton icon={RefreshCw} label="Spróbuj ponownie" variant="primary" showLabel onClick={() => this.handleRetry()} />
            <IconButton icon={RefreshCw} label="Odśwież stronę" showLabel onClick={() => window.location.reload()} />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
