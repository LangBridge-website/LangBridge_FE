import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, TableColumn } from '../components/Table';
import { ProgressBar } from '../components/ProgressBar';
import { DocumentListItem, Priority, DocumentFilter, DocumentSortOption } from '../types/document';
import { DocumentState } from '../types/translation';
import { colors } from '../constants/designTokens';
import { Button } from '../components/Button';
import { documentApi, DocumentResponse } from '../services/documentApi';

const categories = ['전체', '웹사이트', '마케팅', '고객지원', '기술문서'];
const priorities = ['전체', '높음', '보통', '낮음'];

// DocumentResponse를 DocumentListItem으로 변환
const convertToDocumentListItem = (doc: DocumentResponse): DocumentListItem => {
  // 진행률 계산 (임시로 0%, 나중에 버전 정보에서 계산)
  const progress = 0;
  
  // 마감일 계산 (임시로 createdAt 기준으로 계산, 나중에 deadline 필드 추가 필요)
  const createdAt = new Date(doc.createdAt);
  const now = new Date();
  const diffDays = Math.ceil((createdAt.getTime() + 7 * 24 * 60 * 60 * 1000 - now.getTime()) / (1000 * 60 * 60 * 24));
  const deadline = diffDays > 0 ? `${diffDays}일 후` : '마감됨';
  
  // 우선순위 (임시로 기본값, 나중에 priority 필드 추가 필요)
  const priority = Priority.MEDIUM;
  
  // 카테고리 이름 (임시로 ID 사용, 나중에 카테고리 API로 이름 가져오기)
  const category = doc.categoryId ? `카테고리 ${doc.categoryId}` : '미분류';

  return {
    id: doc.id,
    title: doc.title,
    category,
    categoryId: doc.categoryId,
    estimatedLength: doc.estimatedLength,
    progress,
    deadline,
    priority,
    status: doc.status as DocumentState,
    lastModified: doc.updatedAt ? formatRelativeTime(doc.updatedAt) : undefined,
    assignedManager: doc.lastModifiedBy?.name,
    isFinal: false, // 나중에 버전 정보에서 가져오기
    originalUrl: doc.originalUrl,
  };
};

// 상대 시간 포맷팅 (예: "2시간 전")
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins}분 전`;
  } else if (diffHours < 24) {
    return `${diffHours}시간 전`;
  } else {
    return `${diffDays}일 전`;
  }
};

export default function TranslationsPending() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [selectedPriority, setSelectedPriority] = useState<string>('전체');
  const [sortOption, setSortOption] = useState<DocumentSortOption>({
    field: 'deadline',
    order: 'asc',
  });

  // API에서 문서 목록 가져오기
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('📋 번역 대기 문서 조회 시작...');
        
        // 모든 문서를 가져온 후 프론트엔드에서 필터링 (더 안전함)
        const response = await documentApi.getAllDocuments();
        console.log('✅ 문서 목록 조회 성공:', response.length, '개');
        console.log('📊 문서 상태 분포:', {
          전체: response.length,
          PENDING_TRANSLATION: response.filter((d) => d.status === 'PENDING_TRANSLATION').length,
          IN_TRANSLATION: response.filter((d) => d.status === 'IN_TRANSLATION').length,
          기타: response.filter((d) => !['PENDING_TRANSLATION', 'IN_TRANSLATION'].includes(d.status)).length,
        });
        
        // PENDING_TRANSLATION 상태만 필터링
        const pendingDocs = response.filter(
          (doc) => doc.status === 'PENDING_TRANSLATION'
        );
        console.log('📌 번역 대기 문서:', pendingDocs.length, '개');
        
        const converted = pendingDocs.map(convertToDocumentListItem);
        setDocuments(converted);
        
        if (converted.length === 0 && response.length > 0) {
          console.warn('⚠️ 번역 대기 문서가 없습니다. 다른 상태의 문서만 존재합니다.');
        }
      } catch (error) {
        console.error('❌ 문서 목록 조회 실패:', error);
        if (error instanceof Error) {
          console.error('에러 메시지:', error.message);
          console.error('에러 스택:', error.stack);
          setError(`문서 목록을 불러오는데 실패했습니다: ${error.message}`);
        } else {
          setError('문서 목록을 불러오는데 실패했습니다.');
        }
        setDocuments([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, []);

  // 필터링 및 정렬
  const filteredAndSortedDocuments = useMemo(() => {
    let filtered = [...documents];

    // 카테고리 필터
    if (selectedCategory !== '전체') {
      filtered = filtered.filter((doc) => doc.category === selectedCategory);
    }

    // 우선순위 필터
    if (selectedPriority !== '전체') {
      const priorityMap: Record<string, Priority> = {
        높음: Priority.HIGH,
        보통: Priority.MEDIUM,
        낮음: Priority.LOW,
      };
      filtered = filtered.filter((doc) => doc.priority === priorityMap[selectedPriority]);
    }

    // 정렬
    filtered.sort((a, b) => {
      if (sortOption.field === 'deadline') {
        // 마감일 임박순 (간단히 숫자로 변환)
        const aDays = parseInt(a.deadline?.replace('일 후', '') || '999');
        const bDays = parseInt(b.deadline?.replace('일 후', '') || '999');
        return sortOption.order === 'asc' ? aDays - bDays : bDays - aDays;
      } else if (sortOption.field === 'progress') {
        return sortOption.order === 'asc' ? a.progress - b.progress : b.progress - a.progress;
      }
      return 0;
    });

    return filtered;
  }, [documents, selectedCategory, selectedPriority, sortOption]);

  const handleStartTranslation = (doc: DocumentListItem) => {
    // 번역 작업 화면으로 이동
    navigate(`/translations/${doc.id}/work`);
  };

  const columns: TableColumn<DocumentListItem>[] = [
    {
      key: 'title',
      label: '문서 제목',
      width: '30%',
      render: (item) => (
        <span style={{ fontWeight: 500, color: '#000000' }}>{item.title}</span>
      ),
    },
    {
      key: 'category',
      label: '카테고리',
      width: '10%',
      render: (item) => (
        <span style={{ color: colors.primaryText, fontSize: '12px' }}>{item.category}</span>
      ),
    },
    {
      key: 'estimatedLength',
      label: '예상 분량',
      width: '10%',
      render: (item) => (
        <span style={{ color: colors.primaryText }}>
          {item.estimatedLength ? `${item.estimatedLength}자` : '-'}
        </span>
      ),
    },
    {
      key: 'progress',
      label: '작업 진행률',
      width: '15%',
      render: (item) => <ProgressBar progress={item.progress} />,
    },
    {
      key: 'deadline',
      label: '마감일',
      width: '10%',
      align: 'right',
      render: (item) => (
        <span style={{ color: colors.primaryText, fontSize: '12px' }}>
          {item.deadline || '-'}
        </span>
      ),
    },
    {
      key: 'priority',
      label: '우선순위',
      width: '10%',
      render: (item) => {
        const priorityLabels: Record<Priority, string> = {
          [Priority.HIGH]: '높음',
          [Priority.MEDIUM]: '보통',
          [Priority.LOW]: '낮음',
        };
        return (
          <span style={{ color: colors.primaryText, fontSize: '12px' }}>
            {priorityLabels[item.priority]}
          </span>
        );
      },
    },
    {
      key: 'action',
      label: '액션',
      width: '15%',
      align: 'right',
      render: (item) => (
        <Button
          variant={item.progress === 0 ? 'primary' : 'secondary'}
          onClick={(e) => {
            if (e) {
              e.stopPropagation();
            }
            handleStartTranslation(item);
          }}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          {item.progress === 0 ? '번역 시작' : '이어하기'}
        </Button>
      ),
    },
  ];

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: colors.primaryBackground,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#000000',
            marginBottom: '24px',
          }}
        >
          번역 대기 문서
        </h1>

        {/* 필터/정렬 바 */}
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

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: colors.primaryText }}>우선순위:</label>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
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
              {priorities.map((pri) => (
                <option key={pri} value={pri}>
                  {pri}
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
                setSortOption({ field: field as any, order: order as 'asc' | 'desc' });
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
              <option value="deadline-asc">마감일 임박순</option>
              <option value="progress-asc">진행률 낮은 순</option>
              <option value="progress-desc">진행률 높은 순</option>
            </select>
          </div>
        </div>

        {/* 에러 메시지 */}
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

        {/* 테이블 */}
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
              // 행 클릭 시 상세 화면으로 이동 (나중에 구현)
              console.log('문서 클릭:', item.id);
            }}
            emptyMessage="번역 대기 문서가 없습니다. 새 번역 등록에서 문서를 생성하거나, 기존 문서의 상태를 '번역 대기'로 변경해주세요."
          />
        )}
      </div>
    </div>
  );
}

