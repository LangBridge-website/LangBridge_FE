/**
 * 문단 단위 유틸리티 함수
 */

import { colors } from '../constants/designTokens';

export interface Paragraph {
  id: string;
  element: HTMLElement;
  index: number;
}

/**
 * HTML 문자열에서 문단 요소들을 추출하고 ID를 부여
 */
export function extractParagraphs(html: string, containerId: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  // 문단 요소 선택 (p, h1-h6, div, li 등)
  const paragraphSelectors = 'p, h1, h2, h3, h4, h5, h6, div, li, blockquote, article, section';
  const elements = body.querySelectorAll(paragraphSelectors);

  elements.forEach((el, index) => {
    // 텍스트가 있는 요소만 문단으로 간주
    const text = el.textContent?.trim();
    if (text && text.length > 0) {
      const paragraphId = `para-${containerId}-${index}`;
      (el as HTMLElement).setAttribute('data-paragraph-id', paragraphId);
      (el as HTMLElement).setAttribute('data-paragraph-index', index.toString());
    }
  });

  return body.innerHTML;
}

/**
 * DOM에서 문단 요소들을 찾아 반환
 */
export function getParagraphs(container: HTMLElement): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  const elements = container.querySelectorAll('[data-paragraph-id]');

  elements.forEach((el) => {
    const id = (el as HTMLElement).getAttribute('data-paragraph-id');
    const indexStr = (el as HTMLElement).getAttribute('data-paragraph-index');
    if (id && indexStr) {
      paragraphs.push({
        id,
        element: el as HTMLElement,
        index: parseInt(indexStr, 10),
      });
    }
  });

  return paragraphs.sort((a, b) => a.index - b.index);
}

/**
 * 문단 ID로 요소 찾기
 */
export function findParagraphById(container: HTMLElement, paragraphId: string): HTMLElement | null {
  return container.querySelector(`[data-paragraph-id="${paragraphId}"]`) as HTMLElement | null;
}

/**
 * 문단 인덱스로 요소 찾기
 */
export function findParagraphByIndex(container: HTMLElement, index: number): HTMLElement | null {
  return container.querySelector(`[data-paragraph-index="${index}"]`) as HTMLElement | null;
}

/**
 * 스크롤 위치에 해당하는 문단 찾기
 */
export function getParagraphAtScrollPosition(container: HTMLElement, scrollTop: number): Paragraph | null {
  const paragraphs = getParagraphs(container);
  
  for (const para of paragraphs) {
    const rect = para.element.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const relativeTop = rect.top - containerRect.top + container.scrollTop;

    if (relativeTop <= scrollTop + 50 && relativeTop + rect.height >= scrollTop) {
      return para;
    }
  }

  // 가장 가까운 문단 반환
  if (paragraphs.length > 0) {
    let closest = paragraphs[0];
    let minDistance = Math.abs(
      paragraphs[0].element.getBoundingClientRect().top -
      container.getBoundingClientRect().top
    );

    for (const para of paragraphs) {
      const rect = para.element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const distance = Math.abs(rect.top - containerRect.top);

      if (distance < minDistance) {
        minDistance = distance;
        closest = para;
      }
    }

    return closest;
  }

  return null;
}

/**
 * 문단 하이라이트 스타일 적용
 */
export function highlightParagraph(element: HTMLElement, isHighlighted: boolean) {
  if (isHighlighted) {
    element.style.backgroundColor = 'rgba(192, 192, 192, 0.3)';
    element.style.transition = 'background-color 150ms';
    element.style.borderLeft = '3px solid #808080';
    element.style.paddingLeft = '8px';
  } else {
    element.style.backgroundColor = '';
    element.style.borderLeft = '';
    element.style.paddingLeft = '';
  }
}

/**
 * 완료된 문단 스타일 적용
 */
export function markParagraphComplete(element: HTMLElement, isComplete: boolean) {
  if (isComplete) {
    element.style.opacity = '0.7';
    element.style.textDecoration = 'line-through';
    element.style.color = colors.secondaryText;
  } else {
    element.style.opacity = '';
    element.style.textDecoration = '';
    element.style.color = '';
  }
}

/**
 * 모든 문단 하이라이트 제거
 */
export function clearAllHighlights(container: HTMLElement) {
  const paragraphs = getParagraphs(container);
  paragraphs.forEach((para) => {
    para.element.style.backgroundColor = '';
  });
}

