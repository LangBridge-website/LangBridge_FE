import apiClient from './api';
import axios from 'axios';

export interface ReviewResponse {
  id: number;
  document: {
    id: number;
    title: string;
  };
  documentVersion: {
    id: number;
    versionNumber: number;
    versionType: string;
  };
  reviewer: {
    id: number;
    email: string;
    name: string;
  };
  translator?: {
    id: number;
    email: string;
    name: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  comment?: string;
  checklist?: Record<string, boolean>;
  reviewedAt?: string;
  finalApprovalAt?: string;
  publishedAt?: string;
  publishedUrl?: string;
  publishStatus?: 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED' | string;
  publishError?: string;
  isComplete?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  documentId: number;
  documentVersionId: number;
  comment?: string;
  checklist?: Record<string, boolean>;
  isComplete?: boolean;
}

export interface UpdateReviewRequest {
  comment?: string;
  checklist?: Record<string, boolean>;
}

export const reviewApi = {
  /**
   * 리뷰 목록 조회
   */
  getAllReviews: async (params?: {
    documentId?: number;
    documentVersionId?: number;
    reviewerId?: number;
    status?: string;
  }): Promise<ReviewResponse[]> => {
    const queryParams = new URLSearchParams();
    if (params?.documentId) {
      queryParams.append('documentId', params.documentId.toString());
    }
    if (params?.documentVersionId) {
      queryParams.append('documentVersionId', params.documentVersionId.toString());
    }
    if (params?.reviewerId) {
      queryParams.append('reviewerId', params.reviewerId.toString());
    }
    if (params?.status) {
      queryParams.append('status', params.status);
    }
    const queryString = queryParams.toString();
    const url = `/reviews${queryString ? `?${queryString}` : ''}`;
    const response = await apiClient.get<ReviewResponse[]>(url);
    return response.data;
  },

  /**
   * 리뷰 상세 조회
   */
  getReviewById: async (id: number): Promise<ReviewResponse> => {
    const response = await apiClient.get<ReviewResponse>(`/reviews/${id}`);
    return response.data;
  },

  /**
   * 리뷰 생성
   */
  createReview: async (request: CreateReviewRequest): Promise<ReviewResponse> => {
    const response = await apiClient.post<ReviewResponse>('/reviews', request);
    return response.data;
  },

  /**
   * 리뷰 수정
   */
  updateReview: async (id: number, request: UpdateReviewRequest): Promise<ReviewResponse> => {
    const response = await apiClient.put<ReviewResponse>(`/reviews/${id}`, request);
    return response.data;
  },

  /**
   * 리뷰 승인
   */
  approveReview: async (id: number): Promise<ReviewResponse> => {
    const response = await apiClient.post<ReviewResponse>(`/reviews/${id}/approve`);
    return response.data;
  },

  /**
   * 리뷰 반려
   */
  rejectReview: async (id: number): Promise<ReviewResponse> => {
    const response = await apiClient.post<ReviewResponse>(`/reviews/${id}/reject`);
    return response.data;
  },

  /**
   * 리뷰 게시 (creation.kr — 게시판 선택 optional)
   */
  publishReview: async (
    id: number,
    request?: { sitePath: string; boardId: string },
  ): Promise<ReviewResponse> => {
    try {
      const response = await apiClient.post<ReviewResponse>(
        `/reviews/${id}/publish`,
        request ?? {},
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data && typeof error.response.data === 'object') {
        const data = error.response.data as ReviewResponse;
        if (data.id != null) {
          return data;
        }
      }
      throw error;
    }
  },
};


