import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5분 (418개 텍스트 노드 번역 시간 고려)
})

// 요청 인터셉터: JWT 토큰을 헤더에 추가
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (import.meta.env.DEV && token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('🔑 API 요청:', {
          url: config.url,
          method: config.method,
          userId: payload.userId,
          roleLevel: payload.roleLevel,
        });
      } catch {
        // ignore decode errors
      }
    } else if (import.meta.env.DEV && !token) {
      console.warn('⚠️ localStorage에 token이 없습니다!');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      const hadToken = Boolean(localStorage.getItem('token'));
      localStorage.removeItem('token');
      if (hadToken && !window.location.pathname.startsWith('/oauth')) {
        const returnPath = window.location.pathname + window.location.search;
        if (returnPath && returnPath !== '/') {
          sessionStorage.setItem('auth_redirect_after_login', returnPath);
        }
        window.location.replace('/');
      }
    }
    return Promise.reject(error);
  }
);

export const translationApi = {
  // 웹페이지 번역
  translateWebPage: async (request) => {
    const response = await apiClient.post('/translate/webpage', request)
    return response.data
  },

  // HTML 문자열 직접 번역
  translateHtml: async (request) => {
    const response = await apiClient.post('/translate/html', request)
    return response.data
  },

  // 헬스체크
  healthCheck: async () => {
    const response = await apiClient.get('/translate/health')
    return response.data
  },
}

export default apiClient

