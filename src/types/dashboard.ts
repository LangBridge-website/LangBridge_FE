export interface Document {
  id: number;
  title: string;
  category: string;
  estimatedVolume?: string;
  lastModified?: string;
  progress?: number;
  translator?: string;
  documentStatus?: string;
  categoryId?: number;
  approvedReviewId?: number;
  publishedUrl?: string;
  publishStatus?: string;
  publishError?: string;
}

export interface DashboardData {
  pendingDocuments: Document[]; // 번역이 필요한 문서
  workingDocuments: Document[]; // 작업 중인 문서
  reviewPendingCount?: number; // 검토 대기 개수 (관리자)
  latestReviewDocument?: Document; // 최신 검토 문서 (관리자)
  approvedDocuments?: Document[]; // 승인된 문서
  rejectedDocuments?: Document[]; // 반려된 문서
}

