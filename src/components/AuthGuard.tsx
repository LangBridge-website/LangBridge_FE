import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { authApi } from '../services/authApi';
import { colors } from '../constants/designTokens';

interface AuthGuardProps {
  children: React.ReactNode;
}

/** Layout 하위: 토큰·사용자 없으면 Google 로그인(/)으로 */
export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const token = authApi.getToken();
    if (!token || !user) {
      const returnPath = location.pathname + location.search;
      if (returnPath && returnPath !== '/') {
        sessionStorage.setItem('auth_redirect_after_login', returnPath);
      }
      navigate('/', { replace: true });
    }
  }, [loading, user, navigate, location.pathname, location.search]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          color: colors.secondaryText,
          fontSize: '14px',
        }}
      >
        로그인 확인 중…
      </div>
    );
  }

  if (!authApi.getToken() || !user) {
    return null;
  }

  return <>{children}</>;
};
