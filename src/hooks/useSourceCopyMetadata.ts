import { useState, useEffect, useMemo } from "react";
import {
	documentApi,
	type SourceCopySummary,
	type SourceListEnrichmentResponse,
} from "../services/documentApi";
import type { DocumentState } from "../types/translation";

export interface SourceCopyMetadataState {
	generatedCopyCountBySourceId: Map<number, number>;
	inTranslationCopyCountBySourceId: Map<number, number>;
	copyWorkersBySourceId: Map<number, string[]>;
	copyStatusesBySourceId: Map<number, DocumentState[]>;
	myInTranslationBySourceId: Map<number, boolean>;
	originalParagraphCountByDocumentId: Map<number, number>;
	loading: boolean;
}

const EMPTY: SourceCopyMetadataState = {
	generatedCopyCountBySourceId: new Map(),
	inTranslationCopyCountBySourceId: new Map(),
	copyWorkersBySourceId: new Map(),
	copyStatusesBySourceId: new Map(),
	myInTranslationBySourceId: new Map(),
	originalParagraphCountByDocumentId: new Map(),
	loading: false,
};

function applyEnrichment(
	data: SourceListEnrichmentResponse,
	userId: number | undefined,
): Omit<SourceCopyMetadataState, "loading"> {
	const generatedCopyCountBySourceId = new Map<number, number>();
	const inTranslationCopyCountBySourceId = new Map<number, number>();
	const copyWorkersBySourceId = new Map<number, string[]>();
	const copyStatusesBySourceId = new Map<number, DocumentState[]>();
	const myInTranslationBySourceId = new Map<number, boolean>();
	const originalParagraphCountByDocumentId = new Map<number, number>();

	const myActive = new Set(data.myInTranslationSourceIds ?? []);

	for (const [idStr, summary] of Object.entries(data.copySummaries ?? {})) {
		const id = Number(idStr);
		if (Number.isNaN(id) || !summary) continue;
		generatedCopyCountBySourceId.set(id, summary.totalCopyCount);
		inTranslationCopyCountBySourceId.set(id, summary.inTranslationCount);
		copyWorkersBySourceId.set(id, summary.workerNames ?? []);
		copyStatusesBySourceId.set(
			id,
			(summary.copyStatuses ?? []) as DocumentState[],
		);
		if (userId != null) {
			myInTranslationBySourceId.set(id, myActive.has(id));
		}
	}

	for (const [idStr, count] of Object.entries(
		data.originalParagraphCounts ?? {},
	)) {
		const id = Number(idStr);
		if (!Number.isNaN(id)) {
			originalParagraphCountByDocumentId.set(id, count);
		}
	}

	return {
		generatedCopyCountBySourceId,
		inTranslationCopyCountBySourceId,
		copyWorkersBySourceId,
		copyStatusesBySourceId,
		myInTranslationBySourceId,
		originalParagraphCountByDocumentId,
	};
}

/**
 * 원문 목록용 배치 메타 (copies / my-copy / favorite N+1 대체).
 */
export function useSourceCopyMetadata(
	sourceIds: readonly number[],
	userId: number | undefined,
	progressDocumentIds?: readonly number[],
): SourceCopyMetadataState {
	const sourceKey = useMemo(
		() =>
			[...sourceIds]
				.filter((id) => !Number.isNaN(id))
				.sort((a, b) => a - b)
				.join(","),
		[sourceIds],
	);

	const progressKey = useMemo(
		() =>
			progressDocumentIds && progressDocumentIds.length > 0
				? [...progressDocumentIds]
						.filter((id) => !Number.isNaN(id))
						.sort((a, b) => a - b)
						.join(",")
				: "",
		[progressDocumentIds],
	);

	const [state, setState] = useState<SourceCopyMetadataState>(EMPTY);

	useEffect(() => {
		if (!sourceKey) {
			setState(EMPTY);
			return;
		}
		const ids = sourceKey.split(",").map((s) => Number.parseInt(s, 10));
		const progressIds = progressKey
			? progressKey.split(",").map((s) => Number.parseInt(s, 10))
			: undefined;

		let cancelled = false;
		setState((prev) => ({ ...prev, loading: true }));

		(async () => {
			try {
				const data = await documentApi.getSourceListEnrichment({
					sourceDocumentIds: ids,
					progressDocumentIds: progressIds,
				});
				if (cancelled) return;
				setState({
					...applyEnrichment(data, userId),
					loading: false,
				});
			} catch {
				if (cancelled) return;
				setState({ ...EMPTY, loading: false });
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [sourceKey, progressKey, userId]);

	return state;
}

export { applyEnrichment };
