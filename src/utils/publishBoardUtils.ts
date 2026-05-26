import type { CreationKrBoardOption } from '../services/publishApi';

export function groupBoardsByMajor(boards: CreationKrBoardOption[]): Map<string, CreationKrBoardOption[]> {
  const groups = new Map<string, CreationKrBoardOption[]>();
  for (const board of boards) {
    const major = board.majorCategory || '기타';
    const list = groups.get(major) ?? [];
    list.push(board);
    groups.set(major, list);
  }
  return groups;
}

export function buildBoardKey(board: CreationKrBoardOption): string {
  return `${board.sitePath}::${board.boardId}`;
}

export function findBoardByKey(
  boards: CreationKrBoardOption[],
  key: string,
): CreationKrBoardOption | undefined {
  return boards.find((b) => buildBoardKey(b) === key);
}

export function resolveInitialBoardKey(
  boards: CreationKrBoardOption[],
  suggested?: {
    suggestedSitePath?: string;
    suggestedBoardId?: string;
  },
): string {
  if (boards.length === 0) {
    return '';
  }
  if (suggested?.suggestedSitePath && suggested?.suggestedBoardId) {
    const exact = findBoardByKey(
      boards,
      `${suggested.suggestedSitePath}::${suggested.suggestedBoardId}`,
    );
    if (exact) {
      return buildBoardKey(exact);
    }
    const bySitePath = boards.find((b) => b.sitePath === suggested.suggestedSitePath);
    if (bySitePath) {
      return buildBoardKey(bySitePath);
    }
  }
  return buildBoardKey(boards[0]);
}

export function formatBoardOptionLabel(
  board: CreationKrBoardOption,
  suggestedLabel?: string | null,
): string {
  const suffix =
    suggestedLabel && board.label === suggestedLabel ? ' (추천)' : '';
  return `${board.label}${suffix}`;
}
