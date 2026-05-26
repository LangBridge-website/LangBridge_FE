/**
 * 번역 목록의 「현재 버전」 표시.
 * - 서버 `userFacingVersionNumber` 우선: 원문=v1, 복사본은 생성 순 v2,v3…
 * - DB `versionNumber`(임시저장마다 증가·계열 max)는 목록에 쓰지 않음.
 */
export function formatTranslationListVersionLabel(
  isFinal: boolean | undefined,
  versionNumber: number | null | undefined,
  userFacingVersionNumber?: number | null
): string {
  if (isFinal) return 'FINAL';
  const n = userFacingVersionNumber ?? versionNumber;
  if (n == null) return '-';
  if (n === 0) return 'v1';
  return `v${n}`;
}
