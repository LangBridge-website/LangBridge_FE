import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary 컴포넌트
 * 
 * React 컴포넌트 트리에서 발생하는 에러를 캐치하여
 * 앱 전체가 크래시되는 것을 방지합니다.
 * 
 * 사용법:
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // 다음 렌더에서 fallback UI가 보이도록 상태를 업데이트합니다.
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 에러 리포팅 서비스에 에러를 기록할 수 있습니다.
    console.error('🚨 ErrorBoundary가 에러를 캐치했습니다:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // 개발 환경에서만 상세한 에러 정보 표시
    if (process.env.NODE_ENV === 'development') {
      console.group('📋 에러 상세 정보');
      console.error('에러:', error);
      console.error('에러 정보:', errorInfo);
      console.error('컴포넌트 스택:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // 커스텀 fallback UI가 제공되면 사용
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 기본 fallback UI
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '24px',
            backgroundColor: '#f5f5f5',
            borderRadius: '8px',
            margin: '16px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', color: '#d32f2f' }}>
            문제가 발생했습니다
          </h2>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px', textAlign: 'center', maxWidth: '600px' }}>
            페이지를 로드하는 중 오류가 발생했습니다. 
            아래 버튼을 클릭하여 다시 시도하거나, 페이지를 새로고침해주세요.
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details
              style={{
                width: '100%',
                maxWidth: '800px',
                marginBottom: '24px',
                padding: '16px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 'bold', marginBottom: '8px' }}>
                개발자 정보 (개발 모드에서만 표시)
              </summary>
              <div style={{ fontSize: '12px', fontFamily: 'monospace', whiteSpace: 'pre-wrap', overflow: 'auto' }}>
                <div style={{ marginBottom: '8px' }}>
                  <strong>에러 메시지:</strong>
                  <div style={{ color: '#d32f2f', marginTop: '4px' }}>{this.state.error.toString()}</div>
                </div>
                {this.state.errorInfo && (
                  <div>
                    <strong>컴포넌트 스택:</strong>
                    <div style={{ color: '#666', marginTop: '4px' }}>{this.state.errorInfo.componentStack}</div>
                  </div>
                )}
              </div>
            </details>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#fff',
                backgroundColor: '#1976d2',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              다시 시도
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1976d2',
                backgroundColor: 'transparent',
                border: '1px solid #1976d2',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

