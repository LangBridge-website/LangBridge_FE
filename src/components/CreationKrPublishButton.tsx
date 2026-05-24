import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';
import { useUser } from '../contexts/UserContext';
import { isAdminOrAbove } from '../utils/hasAccess';
import { type ReviewResponse } from '../services/reviewApi';

export type PublishStatus = 'NONE' | 'PENDING' | 'SUCCESS' | 'FAILED' | string | null | undefined;

interface CreationKrPublishButtonProps {
  reviewId: number;
  categoryId?: number;
  documentTitle?: string;
  publishStatus?: PublishStatus;
  publishedUrl?: string | null;
  publishError?: string | null;
  documentStatus?: string;
  onSuccess?: (response: ReviewResponse) => void;
  compact?: boolean;
}

export const CreationKrPublishButton: React.FC<CreationKrPublishButtonProps> = ({
  reviewId,
  publishStatus,
  publishedUrl,
  publishError,
  documentStatus,
  compact = false,
}) => {
  const navigate = useNavigate();
  const { user } = useUser();
  const canPublish = isAdminOrAbove(user?.roleLevel);

  const isPublished =
    documentStatus === 'PUBLISHED' ||
    publishStatus === 'SUCCESS' ||
    Boolean(publishedUrl);

  if (isPublished && publishedUrl) {
    return (
      <a
        href={publishedUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: compact ? '11px' : '12px',
          color: '#2563eb',
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
        }}
      >
        creation.kr에서 보기 ↗
      </a>
    );
  }

  if (isPublished) {
    return (
      <span style={{ fontSize: compact ? '11px' : '12px', color: '#047857' }}>
        게시 완료
      </span>
    );
  }

  if (!canPublish) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: compact ? 'flex-end' : 'stretch',
        gap: '4px',
      }}
    >
      <Button
        variant="primary"
        onClick={() => navigate(`/reviews/${reviewId}/publish`)}
        style={{ fontSize: compact ? '11px' : '12px', padding: compact ? '4px 8px' : '6px 12px' }}
      >
        {publishStatus === 'FAILED' ? 'creation.kr 재시도' : 'creation.kr 게시'}
      </Button>
      {publishStatus === 'FAILED' && publishError && (
        <span
          style={{
            fontSize: '10px',
            color: '#b91c1c',
            maxWidth: compact ? '160px' : '240px',
            textAlign: compact ? 'right' : 'left',
          }}
          title={publishError}
        >
          {publishError.length > 60 ? `${publishError.slice(0, 60)}…` : publishError}
        </span>
      )}
    </div>
  );
};
