import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Table, TableColumn } from '../components/Table';
import { DocumentSortOption } from '../types/document';
import { colors } from '../constants/designTokens';
import { documentApi, type DocumentResponse } from '../services/documentApi';
import { categoryApi } from '../services/categoryApi';
import { formatLastModifiedDate } from '../utils/dateUtils';
import { useUser } from '../contexts/UserContext';
import { isAdminOrAbove } from '../utils/hasAccess';
import { CreationKrPublishButton } from '../components/CreationKrPublishButton';
import { Button } from '../components/Button';
import { type ReviewResponse } from '../services/reviewApi';

type PublishTab = 'pending' | 'published';

interface PublishListItem {
  id: number;
  title: string;
  category: string;
  categoryId?: number;
  approvedAt?: string;
  publishStatus?: string;
  publishedUrl?: string;
  publishError?: string;
  approvedReviewId?: number;
  documentStatus: string;
}

function isPublishCompleted(doc: DocumentResponse): boolean {
  return (
    doc.status === 'PUBLISHED' ||
    (doc.publishStatus === 'SUCCESS' && Boolean(doc.publishedUrl))
  );
}

function isPublishPending(doc: DocumentResponse): boolean {
  return Boolean(doc.approvedReviewId) && doc.status === 'APPROVED' && !isPublishCompleted(doc);
}

function getPublishStatusLabel(status?: string): string {
  switch (status) {
    case 'SUCCESS':
      return '게시 완료';
    case 'FAILED':
      return '게시 실패';
    case 'PENDING':
      return '게시 중';
    case 'NONE':
    default:
      return '게시 대기';
  }
}

const publishStatusChipStyles: Record<string, { bg: string; text: string; border: string }> = {
  '게시 대기': { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  '게시 중': { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD' },
  '게시 실패': { bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
  '게시 완료': { bg: '#CCFBF1', text: '#0F766E', border: '#5EEAD4' },
};

export default function PublishList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: userLoading } = useUser();
  const canAccess = isAdminOrAbove(user?.roleLevel);

  const activeTab: PublishTab =
    searchParams.get('tab') === 'published' ? 'published' : 'pending';

  const [documents, setDocuments] = useState<PublishListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [sortOption, setSortOption] = useState<DocumentSortOption>({
    field: 'lastModified',
    order: 'desc',
  });
  const [categoryMap, setCategoryMap] = useState<Map<number, string>>(new Map());
  const [categories, setCategories] = useState<string[]>(['전체']);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryList = await categoryApi.getAllCategories();
        const map = new Map<number, string>();
        categoryList.forEach((cat) => {
          map.set(cat.id, cat.name);
        });
        setCategoryMap(map);
        setCategories(['전체', ...categoryList.map((cat) => cat.name)]);
      } catch (err) {
        console.error('카테고리 목록 로드 실패:', err);
      }
    };
    loadCategories();
  }, []);

  const toListItem = useCallback(
    (doc: DocumentResponse): PublishListItem => {
      const category =
        doc.categoryId && categoryMap.has(doc.categoryId)
          ? categoryMap.get(doc.categoryId)!
          : doc.categoryId
            ? `카테고리 ${doc.categoryId}`
            : '미분류';

      return {
        id: doc.id,
        title: doc.title,
        category,
        categoryId: doc.categoryId,
        approvedAt: doc.updatedAt ? formatLastModifiedDate(doc.updatedAt) : undefined,
        publishStatus: doc.publishStatus,
        publishedUrl: doc.publishedUrl,
        publishError: doc.publishError,
        approvedReviewId: doc.approvedReviewId,
        documentStatus: doc.status,
      };
    },
    [categoryMap],
  );

  const fetchDocuments = useCallback(async () => {
    if (!canAccess) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [approvedDocs, publishedDocs] = await Promise.all([
        documentApi.getAllDocuments({ status: 'APPROVED' }),
        documentApi.getAllDocuments({ status: 'PUBLISHED' }),
      ]);

      const merged = new Map<number, DocumentResponse>();
      [...approvedDocs, ...publishedDocs].forEach((doc) => {
        merged.set(doc.id, doc);
      });

      const allDocs = Array.from(merged.values());
      const filtered =
        activeTab === 'pending'
          ? allDocs.filter(isPublishPending)
          : allDocs.filter(isPublishCompleted);

      setDocuments(filtered.map(toListItem));
    } catch (err) {
      console.error('게시 문서 목록 조회 실패:', err);
      setError(
        err instanceof Error
          ? `게시 문서를 불러오는데 실패했습니다: ${err.message}`
          : '게시 문서를 불러오는데 실패했습니다.',
      );
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, canAccess, toListItem]);

  useEffect(() => {
    if (userLoading) return;
    fetchDocuments();
  }, [fetchDocuments, userLoading]);

  const handlePublishSuccess = (_reviewId: number, response: ReviewResponse) => {
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.approvedReviewId === response.id
          ? {
              ...doc,
              publishStatus: response.publishStatus,
              publishedUrl: response.publishedUrl,
              publishError: response.publishError,
              documentStatus:
                response.publishStatus === 'SUCCESS' ? 'PUBLISHED' : doc.documentStatus,
            }
          : doc,
      ),
    );
  };

  const setTab = (tab: PublishTab) => {
    setSearchParams(tab === 'pending' ? {} : { tab });
  };

  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = [...documents];

    if (selectedCategory !== '전체') {
      filtered = filtered.filter((doc) => doc.category === selectedCategory);
    }

    filtered.sort((a, b) => {
      if (sortOption.field === 'lastModified') {
        const aTime = a.approvedAt || '';
        const bTime = b.approvedAt || '';
        return sortOption.order === 'asc'
          ? aTime.localeCompare(bTime)
          : bTime.localeCompare(aTime);
      }
      if (sortOption.field === 'title') {
        return sortOption.order === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      }
      return 0;
    });

    return filtered;
  }, [documents, selectedCategory, sortOption]);

  const columns: TableColumn<PublishListItem>[] = [
    {
      key: 'title',
      label: '문서 제목',
      width: '28%',
      render: (item) => (
        <span style={{ fontWeight: 500, color: '#000000' }}>{item.title}</span>
      ),
    },
    {
      key: 'category',
      label: '카테고리',
      width: '12%',
      render: (item) => (
        <span style={{ color: colors.primaryText, fontSize: '12px' }}>{item.category}</span>
      ),
    },
    {
      key: 'approvedAt',
      label: activeTab === 'pending' ? '승인일' : '게시일',
      width: '12%',
      render: (item) => (
        <span style={{ color: colors.primaryText, fontSize: '12px' }}>
          {item.approvedAt || '-'}
        </span>
      ),
    },
    {
      key: 'publishStatus',
      label: '게시 상태',
      width: '12%',
      render: (item) => {
        const label = getPublishStatusLabel(item.publishStatus);
        const chip = publishStatusChipStyles[label] ?? publishStatusChipStyles['게시 대기'];
        return (
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 500,
              backgroundColor: chip.bg,
              color: chip.text,
              border: `1px solid ${chip.border}`,
            }}
          >
            {label}
          </span>
        );
      },
    },
    {
      key: 'action',
      label: '',
      width: '140px',
      align: 'center',
      cellStyle: { overflow: 'visible' },
      render: (item) => {
        if (!item.approvedReviewId) {
          return (
            <span style={{ fontSize: '11px', color: colors.secondaryText }}>리뷰 없음</span>
          );
        }

        return (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <CreationKrPublishButton
              reviewId={item.approvedReviewId}
              categoryId={item.categoryId}
              documentTitle={item.title}
              publishStatus={item.publishStatus}
              publishedUrl={item.publishedUrl}
              publishError={item.publishError}
              documentStatus={item.documentStatus}
              compact
              onSuccess={(response) => handlePublishSuccess(item.approvedReviewId!, response)}
            />
          </div>
        );
      },
    },
  ];

  if (userLoading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: colors.primaryText }}>
        로딩 중...
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div style={{ padding: '24px' }}>
        <div
          style={{
            backgroundColor: colors.surface,
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            border: `1px solid ${colors.border}`,
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>접근 권한 없음</h2>
          <p style={{ fontSize: '14px', color: colors.secondaryText }}>
            creation.kr 게시는 중간·최고관리자만 이용할 수 있습니다.
          </p>
          <Button variant="secondary" onClick={() => navigate('/dashboard')} style={{ marginTop: '16px' }}>
            대시보드로
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: colors.primaryBackground,
        minHeight: '100vh',
      }}
    >
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#000000',
            marginBottom: '8px',
          }}
        >
          creation.kr 게시
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: colors.secondaryText,
            marginBottom: '16px',
          }}
        >
          승인된 문서를 creation.kr에 게시하거나 게시 완료 내역을 확인할 수 있습니다.
        </p>

        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '16px',
          }}
        >
          {(
            [
              { key: 'pending' as const, label: '게시 대기' },
              { key: 'published' as const, label: '게시 완료' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: `1px solid ${activeTab === key ? colors.primaryText : colors.border}`,
                backgroundColor: activeTab === key ? colors.primaryText : colors.surface,
                color: activeTab === key ? '#FFFFFF' : colors.primaryText,
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: colors.primaryText }}>카테고리:</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '6px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: colors.surface,
                color: '#000000',
                cursor: 'pointer',
              }}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: colors.primaryText }}>정렬:</label>
            <select
              value={`${sortOption.field}-${sortOption.order}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortOption({ field: field as DocumentSortOption['field'], order: order as 'asc' | 'desc' });
              }}
              style={{
                padding: '6px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: colors.surface,
                color: '#000000',
                cursor: 'pointer',
              }}
            >
              <option value="lastModified-desc">최근 승인순</option>
              <option value="lastModified-asc">오래된 순</option>
              <option value="title-asc">제목 가나다순</option>
              <option value="title-desc">제목 역순</option>
            </select>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '16px',
              marginBottom: '16px',
              backgroundColor: '#F5F5F5',
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              color: colors.primaryText,
              fontSize: '13px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {loading ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: colors.primaryText,
              fontSize: '13px',
            }}
          >
            로딩 중...
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredAndSortedDocuments}
            onRowClick={(item) => {
              if (item.approvedReviewId && activeTab === 'pending') {
                navigate(`/reviews/${item.approvedReviewId}/publish`);
              }
            }}
            emptyMessage={
              activeTab === 'pending'
                ? '게시 대기 문서가 없습니다. 문서가 검토·승인되면 여기에 표시됩니다.'
                : '게시 완료된 문서가 없습니다.'
            }
          />
        )}
      </div>
    </div>
  );
}
