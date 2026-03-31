import { useCallback, useEffect, useMemo, useState } from 'react';
import { inquiryApi } from '../services/inquiryApi';
import { UserRole } from '../types/user';

const REFRESH_EVENT = 'inquiry-badge-refresh';

export function dispatchInquiryBadgeRefresh() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

/**
 * 사이드바 문의 메뉴 배지
 * - 관리자: 미답변 문의 수 + (본인이 작성한 문의의) 미읽음 문의 건수
 * - 일반 회원: (1) 상세를 아직 안 열어 읽음 처리 전인데 답변이 달린 문의, (2) 열람 후 새 관리자 답변이 달린 문의 — 둘 다 배지에 포함
 */
export function useInquiryBadge(
  role: UserRole | null,
  userId: number | null | undefined,
  userLoading: boolean
) {
  const [adminUnanswered, setAdminUnanswered] = useState(0);
  const [userNewReply, setUserNewReply] = useState(0);
  const [userUnreadBeforeOpen, setUserUnreadBeforeOpen] = useState(0);
  const [userUnreadAfterRead, setUserUnreadAfterRead] = useState(0);

  const load = useCallback(async () => {
    try {
      const c = await inquiryApi.getBadgeCounts();
      setAdminUnanswered(c.adminUnansweredCount ?? 0);
      setUserNewReply(c.userNewReplyCount ?? 0);
      setUserUnreadBeforeOpen(c.userUnreadInquiryBeforeOpenCount ?? 0);
      setUserUnreadAfterRead(c.userUnreadInquiryAfterReadCount ?? 0);
    } catch (e) {
      if (import.meta.env.DEV) {
        console.warn('[inquiry-badge] badge-counts 요청 실패', e);
      }
      setAdminUnanswered(0);
      setUserNewReply(0);
      setUserUnreadBeforeOpen(0);
      setUserUnreadAfterRead(0);
    }
  }, []);

  useEffect(() => {
    if (userLoading) {
      return;
    }
    if (userId == null) {
      setAdminUnanswered(0);
      setUserNewReply(0);
      setUserUnreadBeforeOpen(0);
      setUserUnreadAfterRead(0);
      return;
    }

    load();
    const t = window.setInterval(load, 60_000);
    const onRefresh = () => load();
    window.addEventListener(REFRESH_EVENT, onRefresh);
    return () => {
      window.clearInterval(t);
      window.removeEventListener(REFRESH_EVENT, onRefresh);
    };
  }, [load, userId, userLoading]);

  const isAdmin = role === UserRole.SUPER_ADMIN || role === UserRole.ADMIN;
  /** 일반 회원: 미읽음 문의 건수(첫 열람 전 + 열람 후 새 답변), 관리자: 미답변 + 본인 문의 미읽음 건수 */
  const displayCount = isAdmin ? adminUnanswered + userNewReply : userNewReply;

  const badgeTooltip = useMemo(() => {
    if (displayCount <= 0) return undefined;
    if (isAdmin) {
      const parts: string[] = [];
      if (adminUnanswered > 0) parts.push(`미답변 문의 ${adminUnanswered}건`);
      if (userNewReply > 0) parts.push(`내 문의 미읽음 ${userNewReply}건`);
      return parts.length > 0 ? parts.join(' · ') : undefined;
    }
    return `첫 열람 전 ${userUnreadBeforeOpen}건 · 열람 후 새 답변 ${userUnreadAfterRead}건`;
  }, [
    displayCount,
    isAdmin,
    adminUnanswered,
    userNewReply,
    userUnreadBeforeOpen,
    userUnreadAfterRead,
  ]);

  return {
    displayCount,
    adminUnanswered,
    userNewReply,
    userUnreadBeforeOpen,
    userUnreadAfterRead,
    badgeTooltip,
    refresh: load,
  };
}
