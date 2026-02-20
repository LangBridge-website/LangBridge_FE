import React from 'react';
import { DocumentState } from '../types/translation';
import { colors } from '../constants/designTokens';

interface StatusBadgeProps {
  status: DocumentState;
}

const statusLabels: Record<DocumentState, string> = {
  DRAFT: '초안',
  PENDING_TRANSLATION: '번역 대기',
  IN_TRANSLATION: '번역 중',
  PENDING_REVIEW: '검토 중',
  APPROVED: '승인 완료',
  PUBLISHED: '게시 완료',
};

// 상태별 눈에 띄는 배경/텍스트 색상 (구분하기 쉽게)
const statusStyles: Record<DocumentState, { bg: string; text: string }> = {
  DRAFT: { bg: '#E5E7EB', text: '#4B5563' },           // 회색 - 미시작
  PENDING_TRANSLATION: { bg: '#DBEAFE', text: '#1D4ED8' }, // 파랑 - 번역 대기
  IN_TRANSLATION: { bg: '#FFEDD5', text: '#C2410C' },      // 주황 - 번역 중
  PENDING_REVIEW: { bg: '#EDE9FE', text: '#5B21B6' },      // 보라 - 검토 대기
  APPROVED: { bg: '#D1FAE5', text: '#047857' },            // 초록 - 승인 완료
  PUBLISHED: { bg: '#CCFBF1', text: '#0F766E' },           // 청록 - 게시 완료
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status];
  const label = statusLabels[status];

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: 500,
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {label}
    </span>
  );
}


