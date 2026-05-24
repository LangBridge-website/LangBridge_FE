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
