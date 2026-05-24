import { useMemo } from "react";
import { useSourceCopyMetadata } from "./useSourceCopyMetadata";

/**
 * 원문 id마다, 현재 사용자의 복사본이 번역 중(IN_TRANSLATION)인지 조회.
 * 배치 API 1회 사용 (N+1 /my-copy 방지).
 */
export function useMyInTranslationBySourceId(
	sources: readonly { id: number }[],
	userId: number | undefined,
): Map<number, boolean> {
	const sourceIds = useMemo(
		() => sources.map((d) => d.id).filter((id) => !Number.isNaN(id)),
		[sources],
	);

	const { myInTranslationBySourceId } = useSourceCopyMetadata(
		sourceIds,
		userId,
	);

	return myInTranslationBySourceId;
}
