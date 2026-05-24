import apiClient from './api';

export interface CreationKrBoardOption {
  sitePath: string;
  boardId: string;
  label: string;
  majorCategory?: string;
  source: 'CATEGORY' | 'CONFIG' | string;
}

export interface CreationKrBoardListResponse {
  boards: CreationKrBoardOption[];
  suggestedSitePath?: string;
  suggestedBoardId?: string;
  suggestedLabel?: string;
}

export const publishApi = {
  getBoards: async (categoryId?: number): Promise<CreationKrBoardListResponse> => {
    const params = categoryId != null ? { categoryId } : undefined;
    const response = await apiClient.get<CreationKrBoardListResponse>('/publish/creation-kr/boards', {
      params,
    });
    return response.data;
  },
};
