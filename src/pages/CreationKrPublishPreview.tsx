import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { colors } from '../constants/designTokens';
import { useUser } from '../contexts/UserContext';
import { publishApi } from '../services/publishApi';
import { reviewApi, type PublishPreviewResponse } from '../services/reviewApi';
import { isAdminOrAbove } from '../utils/hasAccess';
import { buildBoardKey, findBoardByKey, groupBoardsByMajor } from '../utils/publishBoardUtils';

function buildPreviewDocument(html: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px; line-height: 1.7; color: #1a1a1a; max-width: 900px; margin: 0 auto; }
    img { max-width: 100%; height: auto; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 1px solid #ddd; padding: 8px; }
  </style></head><body>${html}</body></html>`;
}

const CreationKrPublishPreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: userLoading } = useUser();
  const reviewId = id ? Number(id) : NaN;

  const [preview, setPreview] = useState<PublishPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [loadingBoards, setLoadingBoards] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState('');
  const [suggestedLabel, setSuggestedLabel] = useState<string | null>(null);
  const [boards, setBoards] = useState<Awaited<ReturnType<typeof publishApi.getBoards>>['boards']>([]);

  const groupedBoards = useMemo(() => groupBoardsByMajor(boards), [boards]);
  const canAccess = isAdminOrAbove(user?.roleLevel);

  useEffect(() => {
    if (userLoading || !canAccess || !Number.isFinite(reviewId)) {
      setLoadingPreview(false);
      return;
    }

    const loadPreview = async () => {
      try {
        setLoadingPreview(true);
        setError(null);
        const data = await reviewApi.getPublishPreview(reviewId);
        setPreview(data);
      } catch (e) {
        console.error('게시 미리보기 로드 실패:', e);
        setError('게시 미리보기를 불러오지 못했습니다.');
      } finally {
        setLoadingPreview(false);
      }
    };

    loadPreview();
  }, [reviewId, canAccess, userLoading]);

  useEffect(() => {
    if (!preview || !canAccess) {
      return;
    }

    const loadBoards = async () => {
      try {
        setLoadingBoards(true);
        const response = await publishApi.getBoards(preview.categoryId);
        setBoards(response.boards);

        let initialKey = '';
        if (response.suggestedSitePath && response.suggestedBoardId) {
          initialKey = `${response.suggestedSitePath}::${response.suggestedBoardId}`;
          setSuggestedLabel(response.suggestedLabel ?? null);
        } else if (response.boards.length > 0) {
          initialKey = buildBoardKey(response.boards[0]);
        }
        setSelectedKey(initialKey);
      } catch (e) {
        console.error('게시판 목록 로드 실패:', e);
        setError('creation.kr 게시판 목록을 불러오지 못했습니다.');
      } finally {
        setLoadingBoards(false);
      }
    };

    loadBoards();
  }, [preview, canAccess]);

  const handlePublish = async () => {
    if (!preview || publishing || loadingBoards || boards.length === 0) {
      return;
    }

    const selected = findBoardByKey(boards, selectedKey);
    if (!selected) {
      setError('게시할 creation.kr 게시판을 선택해주세요.');
      return;
    }

    const confirmed = window.confirm(
      `「${preview.title}」을(를) creation.kr「${selected.label}」게시판에 게시하시겠습니까?\n\nPlaywright 자동 게시로 30~60초 정도 소요될 수 있습니다.`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setPublishing(true);
      setError(null);
      const response = await reviewApi.publishReview(reviewId, {
        sitePath: selected.sitePath,
        boardId: selected.boardId,
      });

      if (response.publishStatus === 'SUCCESS' || response.publishedUrl) {
        alert(`creation.kr「${selected.label}」게시판에 게시되었습니다.`);
        navigate('/dashboard');
        return;
      }

      setError(response.publishError || 'creation.kr 게시에 실패했습니다.');
      setPreview((prev) =>
        prev
          ? {
              ...prev,
              publishStatus: response.publishStatus,
              publishError: response.publishError,
              publishedUrl: response.publishedUrl,
              publishable: false,
            }
          : prev,
      );
    } catch (e: unknown) {
      console.error('creation.kr 게시 실패:', e);
      const err = e as { response?: { data?: { publishError?: string; message?: string } } };
      setError(
        err.response?.data?.publishError ||
          err.response?.data?.message ||
          'creation.kr 게시 중 오류가 발생했습니다.',
      );
    } finally {
      setPublishing(false);
    }
  };

  if (userLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <p style={{ color: colors.secondaryText }}>로딩 중…</p>
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
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>접근 권한 없음</h2>
          <p style={{ fontSize: '14px', color: colors.secondaryText }}>
            creation.kr 게시는 중간·최고관리자만 이용할 수 있습니다.
          </p>
          <Button variant="secondary" onClick={() => navigate(-1)} style={{ marginTop: '16px' }}>
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            background: 'none',
            border: 'none',
            color: colors.secondaryText,
            cursor: 'pointer',
            fontSize: '13px',
            marginBottom: '12px',
            padding: 0,
          }}
        >
          ← 이전으로
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: colors.primaryText, marginBottom: '8px' }}>
          creation.kr 게시 미리보기
        </h1>
        <p style={{ fontSize: '14px', color: colors.secondaryText, margin: 0 }}>
          게시 전 제목·본문·게시판을 확인한 뒤 최종 게시하세요.
        </p>
      </div>

      {loadingPreview && (
        <p style={{ fontSize: '14px', color: colors.secondaryText }}>미리보기 불러오는 중…</p>
      )}

      {!loadingPreview && preview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <section
            style={{
              backgroundColor: colors.surface,
              borderRadius: '8px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>게시 정보</h2>
            <p style={{ fontSize: '14px', margin: '0 0 8px' }}>
              <strong>제목:</strong> {preview.title}
            </p>
            <p style={{ fontSize: '13px', color: colors.secondaryText, margin: 0 }}>
              리뷰 상태: {preview.reviewStatus} · 문서 상태: {preview.documentStatus}
              {preview.publishStatus && ` · 게시 상태: ${preview.publishStatus}`}
            </p>
            {preview.publishedUrl && (
              <p style={{ fontSize: '13px', marginTop: '8px' }}>
                <a href={preview.publishedUrl} target="_blank" rel="noopener noreferrer">
                  이미 게시된 글 보기 ↗
                </a>
              </p>
            )}
          </section>

          <section
            style={{
              backgroundColor: colors.surface,
              borderRadius: '8px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>본문 미리보기</h2>
            <p style={{ fontSize: '13px', color: colors.secondaryText, marginBottom: '12px' }}>
              creation.kr에 게시될 sanitize된 HTML입니다.
            </p>
            {preview.sanitizedHtml ? (
              <iframe
                title="게시 미리보기"
                srcDoc={buildPreviewDocument(preview.sanitizedHtml)}
                sandbox=""
                style={{
                  width: '100%',
                  minHeight: '480px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: 'white',
                }}
              />
            ) : (
              <p style={{ fontSize: '13px', color: '#b91c1c' }}>게시할 본문 HTML이 없습니다.</p>
            )}
          </section>

          <section
            style={{
              backgroundColor: colors.surface,
              borderRadius: '8px',
              padding: '20px',
              border: `1px solid ${colors.border}`,
            }}
          >
            <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px' }}>게시판 선택</h2>

            {loadingBoards && (
              <p style={{ fontSize: '13px', color: colors.secondaryText }}>게시판 목록 불러오는 중…</p>
            )}

            {!loadingBoards && boards.length === 0 && (
              <p style={{ fontSize: '13px', color: '#b91c1c' }}>
                등록된 creation.kr 게시판이 없습니다. application.yml board-mappings 또는 카테고리
                creationKrSitePath 설정을 확인해주세요.
              </p>
            )}

            {!loadingBoards && boards.length > 0 && (
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                disabled={publishing || !preview.publishable}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontSize: '14px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  marginBottom: '16px',
                }}
              >
                {Array.from(groupedBoards.entries()).map(([major, groupBoards]) => (
                  <optgroup key={major} label={major}>
                    {groupBoards.map((board) => (
                      <option key={buildBoardKey(board)} value={buildBoardKey(board)}>
                        {board.label}
                        {suggestedLabel && board.label === suggestedLabel ? ' (추천)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}

            {!preview.publishable && preview.publishStatus !== 'SUCCESS' && (
              <p style={{ fontSize: '13px', color: '#b45309', marginBottom: '12px' }}>
                현재 상태에서는 게시할 수 없습니다. 승인·완전 번역 조건을 확인해주세요.
              </p>
            )}

            {error && (
              <p style={{ fontSize: '13px', color: '#b91c1c', marginBottom: '12px' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <Button variant="secondary" onClick={() => navigate(-1)} disabled={publishing}>
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handlePublish}
                disabled={
                  publishing ||
                  loadingBoards ||
                  boards.length === 0 ||
                  !preview.publishable ||
                  !preview.sanitizedHtml
                }
              >
                {publishing ? '게시 중…' : '게시하기'}
              </Button>
            </div>
          </section>
        </div>
      )}

      {!loadingPreview && !preview && error && (
        <p style={{ fontSize: '14px', color: '#b91c1c' }}>{error}</p>
      )}
    </div>
  );
};

export default CreationKrPublishPreview;
