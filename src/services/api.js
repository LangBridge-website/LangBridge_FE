import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 300000, // 5분 (418개 텍스트 노드 번역 시간 고려)
})

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

