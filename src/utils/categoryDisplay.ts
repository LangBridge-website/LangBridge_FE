/** categoryId → 표시 이름 (목록·대시보드 공통) */
export function resolveCategoryDisplayName(
  categoryId: number | undefined | null,
  categoryMap: Map<number, string>,
): string {
  if (categoryId == null) {
    return '미분류';
  }
  const name = categoryMap.get(categoryId);
  if (name) {
    return name;
  }
  if (categoryMap.size === 0) {
    return '미분류';
  }
  return `카테고리 ${categoryId}`;
}

export function buildCategoryMapFromList(
  categories: { id: number; name: string }[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const cat of categories) {
    map.set(cat.id, cat.name);
  }
  return map;
}
