import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { roleLevelToRole } from '../utils/hasAccess';
import { UserRole } from '../types/user';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Document, DashboardData } from '../types/dashboard';
import { documentApi, DashboardDocumentCardResponse } from '../services/documentApi';
import { ReviewResponse } from '../services/reviewApi';
import { categoryApi } from '../services/categoryApi';
import { formatLastModifiedDate } from '../utils/dateUtils';
import { CreationKrPublishButton } from '../components/CreationKrPublishButton';

function categoryLabel(categoryId: number | undefined, categoryMap: Map<number, string>): string {
  if (categoryId == null) return '미분류';
  return categoryMap.has(categoryId) ? categoryMap.get(categoryId)! : `카테고리 ${categoryId}`;
}

function mapDashboardCard(
  card: DashboardDocumentCardResponse,
  categoryMap: Map<number, string>,
  options?: { progress?: number },
): Document {
  return {
    id: card.id,
    title: card.title,
    categoryId: card.categoryId,
    category: categoryLabel(card.categoryId, categoryMap),
    estimatedVolume: card.estimatedLength ? `약 ${card.estimatedLength}자` : undefined,
    lastModified: card.displayAt
      ? formatLastModifiedDate(card.displayAt)
      : card.updatedAt
        ? formatLastModifiedDate(card.updatedAt)
        : undefined,
    progress: options?.progress,
    translator: card.translatorName,
    documentStatus: card.documentStatus,
    approvedReviewId: card.approvedReviewId,
    publishedUrl: card.publishedUrl,
    publishStatus: card.publishStatus,
    publishError: card.publishError,
  };
}

function remapDashboardCategories(data: DashboardData, categoryMap: Map<number, string>): DashboardData {
  const remap = (doc: Document): Document => ({
    ...doc,
    category: categoryLabel(doc.categoryId, categoryMap),
  });
  return {
    ...data,
    pendingDocuments: data.pendingDocuments.map(remap),
    workingDocuments: data.workingDocuments.map(remap),
    latestReviewDocument: data.latestReviewDocument ? remap(data.latestReviewDocument) : undefined,
    approvedDocuments: data.approvedDocuments?.map(remap),
    rejectedDocuments: data.rejectedDocuments?.map(remap),
  };
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [data, setData] = useState<DashboardData>({
    pendingDocuments: [],
    workingDocuments: [],
    approvedDocuments: [],
    rejectedDocuments: [],
  });
  const [loading, setLoading] = useState(true);
  const [categoryMap, setCategoryMap] = useState<Map<number, string>>(new Map());
  const [favoriteStatus, setFavoriteStatus] = useState<Map<number, boolean>>(new Map());

  const userRole = useMemo(() => {
    if (!user) return null;
    return roleLevelToRole(user.roleLevel);
  }, [user]);

  const handleToggleFavorite = async (docId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isFavorite = favoriteStatus.get(docId) || false;
      if (isFavorite) {
        await documentApi.removeFavorite(docId);
        setFavoriteStatus(prev => {
          const newMap = new Map(prev);
          newMap.set(docId, false);
          return newMap;
        });
      } else {
        await documentApi.addFavorite(docId);
        setFavoriteStatus(prev => {
          const newMap = new Map(prev);
          newMap.set(docId, true);
          return newMap;
        });
      }
    } catch (error) {
      console.error('찜 상태 변경 실패:', error);
      alert('찜 상태를 변경하는데 실패했습니다.');
    }
  };

  const handleApprovedPublishSuccess = (docId: number, response: ReviewResponse) => {
    setData((prev) => ({
      ...prev,
      approvedDocuments: prev.approvedDocuments?.map((d) =>
        d.id === docId
          ? {
              ...d,
              documentStatus: response.publishStatus === 'SUCCESS' ? 'PUBLISHED' : d.documentStatus,
              publishStatus: response.publishStatus,
              publishedUrl: response.publishedUrl,
              publishError: response.publishError,
            }
          : d,
      ),
    }));
  };

  const isAdmin = useMemo(() => {
    return userRole === UserRole.SUPER_ADMIN || userRole === UserRole.ADMIN;
  }, [userRole]);

  // 카테고리 목록 로드
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryList = await categoryApi.getAllCategories();
        const map = new Map<number, string>();
        categoryList.forEach(cat => {
          map.set(cat.id, cat.name);
        });
        setCategoryMap(map);
      } catch (error) {
        console.error('카테고리 목록 로드 실패:', error);
      }
    };
    loadCategories();
  }, []);

  // 대시보드 데이터 로드 (마운트 1회 — categoryMap 변경 시 재호출하지 않음)
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const summary = await documentApi.getDashboardSummary();

        setData({
          pendingDocuments: summary.pendingDocuments.map((card) =>
            mapDashboardCard(card, categoryMap, { progress: 0 }),
          ),
          workingDocuments: summary.workingDocuments.map((card) =>
            mapDashboardCard(card, categoryMap),
          ),
          reviewPendingCount: summary.reviewPendingCount,
          latestReviewDocument: summary.latestReviewDocument
            ? mapDashboardCard(summary.latestReviewDocument, categoryMap)
            : undefined,
          approvedDocuments: summary.approvedDocuments?.map((card) =>
            mapDashboardCard(card, categoryMap),
          ),
          rejectedDocuments: summary.rejectedDocuments?.map((card) =>
            mapDashboardCard(card, categoryMap),
          ),
        });
      } catch (error) {
        console.error('대시보드 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.id, isAdmin]);

  // 카테고리 이름만 갱신 (대시보드 API 재호출 방지)
  useEffect(() => {
    if (categoryMap.size === 0) return;
    setData((prev) => remapDashboardCategories(prev, categoryMap));
  }, [categoryMap]);

  // 찜 상태 로드 (일괄 API 1회)
  useEffect(() => {
    const loadFavoriteStatus = async () => {
      const allDocIds = [
        ...data.pendingDocuments.map(d => d.id),
        ...data.workingDocuments.map(d => d.id),
        ...(data.approvedDocuments || []).map(d => d.id),
        ...(data.rejectedDocuments || []).map(d => d.id),
        ...(data.latestReviewDocument ? [data.latestReviewDocument.id] : []),
      ];
      if (allDocIds.length === 0) {
        setFavoriteStatus(new Map());
        return;
      }
      try {
        const favoriteIds = await documentApi.getFavoriteBulkStatus(allDocIds);
        const favoriteSet = new Set(favoriteIds);
        const favoriteMap = new Map<number, boolean>();
        for (const docId of allDocIds) {
          favoriteMap.set(docId, favoriteSet.has(docId));
        }
        setFavoriteStatus(favoriteMap);
      } catch (error) {
        console.error('찜 상태 로드 실패:', error);
      }
    };
    if (data.pendingDocuments.length > 0 || data.workingDocuments.length > 0) {
      loadFavoriteStatus();
    }
  }, [data]);

  return (
    <div
      className="p-8"
      style={{
        backgroundColor: '#DCDCDC',
        minHeight: '100vh',
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* 2열 그리드 (데스크톱), 1열 스택 (모바일) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 카드 1: 지금 번역이 필요한 문서 */}
          <Card priority="primary">
            <div className="space-y-4">
              <div>
                <h2
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#000000',
                    fontFamily: 'system-ui, Pretendard, sans-serif',
                    marginBottom: '4px',
                  }}
                >
                  지금 번역이 필요한 문서
                </h2>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#696969',
                    fontFamily: 'system-ui, Pretendard, sans-serif',
                  }}
                >
                  즉시 참여 가능한 작업입니다
                </p>
              </div>

              {data.pendingDocuments.length > 0 ? (
                <div className="space-y-3">
                  {data.pendingDocuments.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #C0C0C0',
                        borderRadius: '8px',
                        backgroundColor: '#D3D3D3', // lightgray - 예전 버전 (카드 1용)
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#000000',
                            fontFamily: 'system-ui, Pretendard, sans-serif',
                            fontWeight: 500,
                            marginBottom: '4px',
                          }}
                        >
                          {doc.title}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#696969',
                            fontFamily: 'system-ui, Pretendard, sans-serif',
                            marginBottom: '2px',
                          }}
                        >
                          {doc.category}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#696969',
                          fontFamily: 'system-ui, Pretendard, sans-serif',
                          marginLeft: '12px',
                          flexShrink: 0,
                          textAlign: 'right',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                        }}
                      >
                        {doc.estimatedVolume && (
                          <div>{doc.estimatedVolume}</div>
                        )}
                        <div>
                          {doc.progress !== undefined ? `${doc.progress}%` : '0%'} 완료
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#696969',
                    fontFamily: 'system-ui, Pretendard, sans-serif',
                    padding: '20px 0',
                  }}
                >
                  현재 번역이 필요한 문서가 없습니다
                </div>
              )}

              <Button
                variant="primary"
                onClick={() => navigate('/translations/pending')}
                className="w-full"
              >
                번역하러 가기
              </Button>
            </div>
          </Card>

          {/* 카드 2: 내가 작업 중인 문서 */}
          <Card priority="normal">
            <div className="space-y-4">
              <div>
                <h2
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#000000',
                    fontFamily: 'system-ui, Pretendard, sans-serif',
                    marginBottom: '4px',
                  }}
                >
                  내가 작업 중인 문서
                </h2>
                {data.workingDocuments.length > 0 && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#696969',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                    }}
                  >
                    마지막 수정: {data.workingDocuments[0]?.lastModified || '정보 없음'}
                  </p>
                )}
              </div>

              {data.workingDocuments.length > 0 ? (
                <div className="space-y-3">
                  {data.workingDocuments.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        padding: '12px',
                        border: '1px solid #C0C0C0',
                        borderRadius: '8px',
                        backgroundColor: '#D3D3D3', // lightgray - 예전 버전 (카드 2용)
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            color: '#000000',
                            fontFamily: 'system-ui, Pretendard, sans-serif',
                            fontWeight: 500,
                            marginBottom: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <button
                            onClick={(e) => handleToggleFavorite(doc.id, e)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              fontSize: '16px',
                              color: (favoriteStatus.get(doc.id) || false) ? '#FFD700' : '#C0C0C0',
                              transition: 'color 0.2s',
                            }}
                            title={(favoriteStatus.get(doc.id) || false) ? '찜 해제' : '찜 추가'}
                          >
                            {(favoriteStatus.get(doc.id) || false) ? '★' : '☆'}
                          </button>
                          <span>{doc.title}</span>
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#696969',
                            fontFamily: 'system-ui, Pretendard, sans-serif',
                          }}
                        >
                          {doc.category}
                        </div>
                      </div>
                      {doc.lastModified && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#696969',
                            fontFamily: 'system-ui, Pretendard, sans-serif',
                            marginLeft: '12px',
                            flexShrink: 0,
                            textAlign: 'right',
                          }}
                        >
                          {doc.lastModified}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    fontSize: '13px',
                    color: '#696969',
                    fontFamily: 'system-ui, Pretendard, sans-serif',
                    padding: '20px 0',
                  }}
                >
                  현재 작업 중인 문서가 없습니다
                </div>
              )}
            </div>
          </Card>

          {/* 카드 3: 검토 대기 문서 (관리자만) */}
          {isAdmin && (
            <Card priority="normal">
              <div className="space-y-4">
                <div>
                  <h2
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#000000',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                      marginBottom: '4px',
                    }}
                  >
                    검토 대기 문서
                  </h2>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#696969',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                    }}
                  >
                    대기 개수: {data.reviewPendingCount || 0}개
                  </p>
                </div>

                {data.latestReviewDocument ? (
                  <div
                    style={{
                      padding: '12px',
                      border: '1px solid #C0C0C0',
                      borderRadius: '8px',
                      backgroundColor: '#D3D3D3', // lightgray - 예전 버전
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#000000',
                          fontFamily: 'system-ui, Pretendard, sans-serif',
                          fontWeight: 500,
                          marginBottom: '4px',
                        }}
                      >
                        {data.latestReviewDocument.title}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#696969',
                          fontFamily: 'system-ui, Pretendard, sans-serif',
                        }}
                      >
                        {data.latestReviewDocument.category}
                      </div>
                    </div>
                    {data.latestReviewDocument.translator && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#696969',
                          fontFamily: 'system-ui, Pretendard, sans-serif',
                          marginLeft: '12px',
                          flexShrink: 0,
                          textAlign: 'right',
                        }}
                      >
                        {data.latestReviewDocument.translator}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#696969',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                      padding: '20px 0',
                    }}
                  >
                    검토 대기 문서가 없습니다
                  </div>
                )}

                <Button
                  variant="secondary"
                  onClick={() => navigate('/reviews')}
                  className="w-full"
                >
                  검토하러 가기
                </Button>
              </div>
            </Card>
          )}

          {/* 카드 4: 승인된 문서 (관리자만) */}
          {isAdmin && (
            <Card priority="normal">
              <div className="space-y-4">
                <div>
                  <h2
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#000000',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                      marginBottom: '4px',
                    }}
                  >
                    승인된 문서
                  </h2>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#696969',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                    }}
                  >
                    최근 승인된 번역 문서입니다
                  </p>
                </div>

                {data.approvedDocuments && data.approvedDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {data.approvedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: '12px',
                          border: '1px solid #C0C0C0',
                          borderRadius: '8px',
                          backgroundColor: '#D3D3D3',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: '12px',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#000000',
                              fontFamily: 'system-ui, Pretendard, sans-serif',
                              fontWeight: 500,
                              marginBottom: '4px',
                            }}
                          >
                            {doc.title}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#696969',
                              fontFamily: 'system-ui, Pretendard, sans-serif',
                            }}
                          >
                            {doc.category}
                          </div>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'flex-end',
                            gap: '6px',
                            flexShrink: 0,
                          }}
                        >
                          {doc.lastModified && (
                            <div
                              style={{
                                fontSize: '12px',
                                color: '#696969',
                                fontFamily: 'system-ui, Pretendard, sans-serif',
                                textAlign: 'right',
                              }}
                            >
                              {doc.lastModified}
                            </div>
                          )}
                          {doc.approvedReviewId && (
                            <CreationKrPublishButton
                              reviewId={doc.approvedReviewId}
                              categoryId={doc.categoryId}
                              documentTitle={doc.title}
                              publishStatus={doc.publishStatus}
                              publishedUrl={doc.publishedUrl}
                              publishError={doc.publishError}
                              documentStatus={doc.documentStatus}
                              compact
                              onSuccess={(response) => handleApprovedPublishSuccess(doc.id, response)}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#696969',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                      padding: '20px 0',
                    }}
                  >
                    승인된 문서가 없습니다
                  </div>
                )}

                <Button
                  variant="secondary"
                  onClick={() => navigate('/documents?status=APPROVED')}
                  className="w-full"
                >
                  승인된 문서 보기
                </Button>
              </div>
            </Card>
          )}

          {/* 카드 5: 반려된 문서 (관리자만) */}
          {isAdmin && (
            <Card priority="normal">
              <div className="space-y-4">
                <div>
                  <h2
                    style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: '#000000',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                      marginBottom: '4px',
                    }}
                  >
                    반려된 문서
                  </h2>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#696969',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                    }}
                  >
                    최근 반려된 번역 문서입니다
                  </p>
                </div>

                {data.rejectedDocuments && data.rejectedDocuments.length > 0 ? (
                  <div className="space-y-3">
                    {data.rejectedDocuments.map((doc) => (
                      <div
                        key={doc.id}
                        style={{
                          padding: '12px',
                          border: '1px solid #C0C0C0',
                          borderRadius: '8px',
                          backgroundColor: '#D3D3D3',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              color: '#000000',
                              fontFamily: 'system-ui, Pretendard, sans-serif',
                              fontWeight: 500,
                              marginBottom: '4px',
                            }}
                          >
                            {doc.title}
                          </div>
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#696969',
                              fontFamily: 'system-ui, Pretendard, sans-serif',
                            }}
                          >
                            {doc.category}
                          </div>
                        </div>
                        {doc.lastModified && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#696969',
                              fontFamily: 'system-ui, Pretendard, sans-serif',
                              marginLeft: '12px',
                              flexShrink: 0,
                              textAlign: 'right',
                            }}
                          >
                            {doc.lastModified}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#696969',
                      fontFamily: 'system-ui, Pretendard, sans-serif',
                      padding: '20px 0',
                    }}
                  >
                    반려된 문서가 없습니다
                  </div>
                )}

                <Button
                  variant="secondary"
                  onClick={() => {
                    // 반려된 문서는 REJECTED 상태의 리뷰를 통해 확인
                    navigate('/reviews');
                  }}
                  className="w-full"
                >
                  반려된 문서 보기
                </Button>
              </div>
            </Card>
          )}

          {/* 카드 6: 번역 가이드 / 용어집 */}
          <Card priority="secondary">
            <div className="space-y-4">
              <div>
                <h2
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#000000',
                    fontFamily: 'system-ui, Pretendard, sans-serif',
                    marginBottom: '4px',
                  }}
                >
                  번역 가이드 / 용어집
                </h2>
                <p
                  style={{
                    fontSize: '12px',
                    color: '#696969',
                    fontFamily: 'system-ui, Pretendard, sans-serif',
                  }}
                >
                  번역 작업 시 참고할 용어집을 확인하세요
                </p>
              </div>

              <div className="space-y-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate('/translation-guide')}
                  className="w-full"
                >
                  번역 가이드
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => navigate('/glossary')}
                  className="w-full"
                >
                  용어집 열기
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
      </div>
    </div>
  );
};

export default Dashboard;



