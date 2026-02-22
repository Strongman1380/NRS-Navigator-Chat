import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'Inter, sans-serif' }}>
          <h1 style={{ color: '#8B1A1A' }}>Something went wrong</h1>
          <p style={{ color: '#666' }}>The application encountered an error. Please try refreshing the page.</p>
          <details style={{ marginTop: '10px', cursor: 'pointer' }}>
            <summary>Error Details</summary>
            <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto', fontSize: '12px' }}>
              {this.state.error?.toString()}
              {'\n\n'}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>,
  );
} catch (error) {
  console.error('Render error:', error);
  const root = document.getElementById('root');
  if (root) {
    const wrapper = document.createElement('div');
    wrapper.style.padding = '20px';
    wrapper.style.fontFamily = 'Inter, sans-serif';

    const title = document.createElement('h1');
    title.style.color = '#8B1A1A';
    title.textContent = 'Application Failed to Load';

    const body = document.createElement('p');
    body.style.color = '#666';
    body.textContent = `Error: ${error?.message || 'Unknown error'}`;

    wrapper.appendChild(title);
    wrapper.appendChild(body);
    root.replaceChildren(wrapper);
  }
}
