import apiClient from './api';

export interface ApiKeyResponse {
  id?: number;
  serviceName: string;
  hasApiKey: boolean;
  updatedAt?: string;
  updatedBy?: number;
}

export interface ApiKeyRequest {
  apiKey: string;
}

export interface CreationKrCredentialResponse {
  serviceName: string;
  hasCredentials: boolean;
  email?: string;
  updatedAt?: string;
  updatedBy?: number;
}

export interface CreationKrCredentialRequest {
  email: string;
  password: string;
}

export interface CreationKrConnectionTestResponse {
  success: boolean;
  message?: string;
}

export const settingsApi = {
  /**
   * DeepL API 키 조회
   */
  getDeepLApiKey: async (): Promise<ApiKeyResponse> => {
    const response = await apiClient.get<ApiKeyResponse>('/settings/deepl-key');
    return response.data;
  },

  /**
   * DeepL API 키 저장/업데이트
   */
  saveDeepLApiKey: async (request: ApiKeyRequest): Promise<ApiKeyResponse> => {
    const response = await apiClient.post<ApiKeyResponse>('/settings/deepl-key', request);
    return response.data;
  },

  getCreationKrCredentials: async (): Promise<CreationKrCredentialResponse> => {
    const response = await apiClient.get<CreationKrCredentialResponse>('/settings/creation-kr-credentials');
    return response.data;
  },

  saveCreationKrCredentials: async (
    request: CreationKrCredentialRequest,
  ): Promise<CreationKrCredentialResponse> => {
    const response = await apiClient.post<CreationKrCredentialResponse>(
      '/settings/creation-kr-credentials',
      request,
    );
    return response.data;
  },

  testCreationKrConnection: async (): Promise<CreationKrConnectionTestResponse> => {
    const response = await apiClient.post<CreationKrConnectionTestResponse>(
      '/settings/creation-kr-credentials/test',
    );
    return response.data;
  },
};

