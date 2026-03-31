import apiClient from './api';

export interface AuthorSummary {
  id: number;
  name: string;
  email: string;
}

export interface InquirySummary {
  id: number;
  title: string;
  author: AuthorSummary;
  createdAt: string;
  hasAdminReply: boolean;
  replyCount: number;
  /** 로그인한 사용자가 해당 글 작성자일 때만: 미읽은 답변 개수 */
  unreadReplyCount?: number;
}

export interface InquiryReply {
  id: number;
  content: string;
  author: AuthorSummary;
  createdAt: string;
  updatedAt: string;
}

export interface InquiryDetail {
  id: number;
  title: string;
  content: string;
  author: AuthorSummary;
  createdAt: string;
  updatedAt: string;
  locked: boolean;
  replies: InquiryReply[];
}

export interface InquiryBadgeCounts {
  adminUnansweredCount: number;
  /** 미읽음이 있는 문의 건수(스레드): 첫 열람 전 + 열람 후 새 답변 */
  userNewReplyCount: number;
  /** 상세를 한 번도 열지 않아 읽음 기록이 없는데, 답변이 있고 아직 읽지 않은 문의 건수 */
  userUnreadInquiryBeforeOpenCount?: number;
  /** 상세를 연 뒤, 그 이후에 달린 미읽음 답변이 있는 문의 건수 */
  userUnreadInquiryAfterReadCount?: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export const inquiryApi = {
  getBadgeCounts: async (): Promise<InquiryBadgeCounts> => {
    const { data } = await apiClient.get<InquiryBadgeCounts>('/inquiries/badge-counts');
    return data;
  },

  list: async (params?: { page?: number; size?: number; mine?: boolean }): Promise<PageResponse<InquirySummary>> => {
    const { data } = await apiClient.get<PageResponse<InquirySummary>>('/inquiries', {
      params: {
        page: params?.page ?? 0,
        size: params?.size ?? 20,
        mine: params?.mine ?? false,
      },
    });
    return data;
  },

  /**
   * @param markRead 상세 페이지에서만 true(기본). 작성/수정 폼 등에서는 false로 읽음 처리 생략.
   */
  getDetail: async (id: number, options?: { markRead?: boolean }): Promise<InquiryDetail> => {
    const markRead = options?.markRead !== false;
    const { data } = await apiClient.get<InquiryDetail>(`/inquiries/${id}`, {
      params: { markRead },
    });
    return data;
  },

  create: async (body: { title: string; content: string }): Promise<InquiryDetail> => {
    const { data } = await apiClient.post<InquiryDetail>('/inquiries', body);
    return data;
  },

  update: async (id: number, body: { title: string; content: string }): Promise<InquiryDetail> => {
    const { data } = await apiClient.put<InquiryDetail>(`/inquiries/${id}`, body);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/inquiries/${id}`);
  },

  createReply: async (inquiryId: number, content: string): Promise<InquiryReply> => {
    const { data } = await apiClient.post<InquiryReply>(`/inquiries/${inquiryId}/replies`, { content });
    return data;
  },

  updateReply: async (inquiryId: number, replyId: number, content: string): Promise<InquiryReply> => {
    const { data } = await apiClient.put<InquiryReply>(`/inquiries/${inquiryId}/replies/${replyId}`, { content });
    return data;
  },

  deleteReply: async (inquiryId: number, replyId: number): Promise<void> => {
    await apiClient.delete(`/inquiries/${inquiryId}/replies/${replyId}`);
  },
};
