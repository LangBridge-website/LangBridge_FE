import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { colors } from '../constants/designTokens';
import { publishApi, type CreationKrBoardOption } from '../services/publishApi';
import { reviewApi, type ReviewResponse } from '../services/reviewApi';

import { groupBoardsByMajor } from '../utils/publishBoardUtils';

interface CreationKrPublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewId: number;
  categoryId?: number;
  documentTitle?: string;
  onSuccess?: (response: ReviewResponse) => void;
}

export const CreationKrPublishModal: React.FC<CreationKrPublishModalProps> = ({
  isOpen,
  onClose,
  reviewId,
  categoryId,
  documentTitle,
  onSuccess,
}) => {
  const [boards, setBoards] = useState<CreationKrBoardOption[]>([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestedLabel, setSuggestedLabel] = useState<string | null>(null);

  const groupedBoards = useMemo(() => groupBoardsByMajor(boards), [boards]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadBoards = async () => {
      try {
        setLoadingBoards(true);
        setError(null);
        const response = await publishApi.getBoards(categoryId);
        setBoards(response.boards);

        let initialKey = '';
        if (response.suggestedSitePath && response.suggestedBoardId) {
          initialKey = `${response.suggestedSitePath}::${response.suggestedBoardId}`;
          setSuggestedLabel(response.suggestedLabel ?? null);
        } else if (response.boards.length > 0) {
          initialKey = `${response.boards[0].sitePath}::${response.boards[0].boardId}`;
        }
        setSelectedKey(initialKey);
      } catch (e) {
        console.error('게시판 목록 로드 실패:', e);
        setError('creation.kr 게시판 목록을 불러오지 못했습니다.');
        setBoards([]);
      } finally {
        setLoadingBoards(false);
      }
    };

    loadBoards();
  }, [isOpen, categoryId]);

  const handlePublish = async () => {
    if (publishing || loadingBoards || boards.length === 0) {
      return;
    }
    const selected = boards.find((b) => `${b.sitePath}::${b.boardId}` === selectedKey);
    if (!selected) {
      setError('게시할 creation.kr 게시판을 선택해주세요.');
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
        onSuccess?.(response);
        onClose();
        return;
      }

      setError(response.publishError || 'creation.kr 게시에 실패했습니다.');
      onSuccess?.(response);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="creation.kr 게시판 선택"
      onConfirm={handlePublish}
      confirmText={publishing ? '게시 중…' : '게시하기'}
      cancelText="취소"
      variant={publishing || loadingBoards || boards.length === 0 ? 'secondary' : 'primary'}
      showCancel={!publishing}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {documentTitle && (
          <p style={{ fontSize: '13px', color: colors.primaryText, margin: 0 }}>
            문서: <strong>{documentTitle}</strong>
          </p>
        )}

        <p style={{ fontSize: '13px', color: colors.secondaryText, margin: 0 }}>
          creation.kr에 개재할 게시판(대홍수-증거, 진화론-유인원 등)을 선택하세요. Playwright 자동
          게시로 30~60초 정도 소요될 수 있습니다.
        </p>

        {loadingBoards && (
          <p style={{ fontSize: '13px', color: colors.secondaryText, margin: 0 }}>게시판 목록 불러오는 중…</p>
        )}

        {!loadingBoards && boards.length === 0 && (
          <p style={{ fontSize: '13px', color: '#b91c1c', margin: 0 }}>
            등록된 creation.kr 게시판이 없습니다. application.yml board-mappings 또는 카테고리
            creationKrSitePath 설정을 확인해주세요.
          </p>
        )}

        {!loadingBoards && boards.length > 0 && (
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '8px',
                color: colors.primaryText,
              }}
            >
              게시판
              {suggestedLabel && (
                <span style={{ fontWeight: 400, color: colors.secondaryText, marginLeft: '6px' }}>
                  (추천: {suggestedLabel})
                </span>
              )}
            </label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              disabled={publishing}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '14px',
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                backgroundColor: 'white',
              }}
            >
              {Array.from(groupedBoards.entries()).map(([major, groupBoards]) => (
                <optgroup key={major} label={major}>
                  {groupBoards.map((board) => (
                    <option
                      key={`${board.sitePath}::${board.boardId}`}
                      value={`${board.sitePath}::${board.boardId}`}
                    >
                      {board.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p style={{ fontSize: '13px', color: '#b91c1c', margin: 0 }}>{error}</p>
        )}
      </div>
    </Modal>
  );
};
