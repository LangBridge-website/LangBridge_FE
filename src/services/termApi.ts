import apiClient from './api';

export interface TermDictionaryResponse {
  id: number;
  sourceTerm: string;
  targetTerm: string;
  sourceLang: string;
  targetLang: string;
  description?: string;
  createdBy?: {
    id: number;
    email: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTermRequest {
  sourceTerm: string;
  targetTerm: string;
  sourceLang: string;
  targetLang: string;
  description?: string;
}

export interface UpdateTermRequest {
  sourceTerm?: string;
  targetTerm?: string;
  sourceLang?: string;
  targetLang?: string;
  description?: string;
}

export const termApi = {
  /**
   * 용어 목록 조회
   */
  getAllTerms: async (params?: {
    sourceLang?: string;
    targetLang?: string;
  }): Promise<TermDictionaryResponse[]> => {
    const queryParams = new URLSearchParams();
    if (params?.sourceLang) {
      queryParams.append('sourceLang', params.sourceLang);
    }
    if (params?.targetLang) {
      queryParams.append('targetLang', params.targetLang);
    }
    const queryString = queryParams.toString();
    const url = `/terms${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<TermDictionaryResponse[]>(url);
    return response.data;
  },

  /**
   * 용어 상세 조회
   */
  getTermById: async (id: number): Promise<TermDictionaryResponse> => {
    const response = await apiClient.get<TermDictionaryResponse>(`/terms/${id}`);
    return response.data;
  },

  /**
   * 용어 검색
   */
  searchTerm: async (
    sourceTerm: string,
    sourceLang: string,
    targetLang: string
  ): Promise<TermDictionaryResponse | null> => {
    try {
      const response = await apiClient.get<TermDictionaryResponse>('/terms/search', {
        params: { sourceTerm, sourceLang, targetLang },
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * 용어 추가
   */
  createTerm: async (request: CreateTermRequest): Promise<TermDictionaryResponse> => {
    const response = await apiClient.post<TermDictionaryResponse>('/terms', request);
    return response.data;
  },

  /**
   * 용어 수정
   */
  updateTerm: async (id: number, request: UpdateTermRequest): Promise<TermDictionaryResponse> => {
    const response = await apiClient.put<TermDictionaryResponse>(`/terms/${id}`, request);
    return response.data;
  },

  /**
   * 용어 삭제
   */
  deleteTerm: async (id: number): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/terms/${id}`);
    return response.data;
  },
};

