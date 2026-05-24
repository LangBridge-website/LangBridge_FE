/**
 * DB 저장·게시용 HTML 추출 유틸
 * - head/meta/link/script 제거
 * - crev.info 등 기사 본문(#contentPost article) 우선 추출
 */

const CONTENT_ROOT_SELECTORS = [
  '#contentPost article',
  '#content article',
  'article',
  'main',
  '[role="main"]',
];

const REMOVED_SELECTOR =
  'script, style, meta, link, noscript, title, head, base, span.mce_SELRES_start, [data-mce-type="bookmark"], iframe[data-disabled="true"]';

function hasMeaningfulContent(root: Element): boolean {
  const text = root.textContent?.trim() ?? '';
  return text.length > 20 || root.querySelectorAll('img').length > 0;
}

function selectContentRoot(doc: Document): Element {
  for (const selector of CONTENT_ROOT_SELECTORS) {
    const candidate = doc.querySelector(selector);
    if (candidate && hasMeaningfulContent(candidate)) {
      return candidate;
    }
  }
  return doc.body;
}

function sanitizeContentRoot(root: Element): void {
  root.querySelectorAll(REMOVED_SELECTOR).forEach((el) => el.remove());

  root.querySelectorAll('iframe').forEach((iframe) => {
    const src = iframe.getAttribute('src')?.trim() ?? '';
    const text = iframe.textContent?.trim() ?? '';
    if (!src && !text) {
      iframe.remove();
    }
  });

  root.querySelectorAll('*').forEach((el) => {
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-paragraph-id');
    el.removeAttribute('data-paragraph-index');
    el.removeAttribute('data-transflow-id');
    el.removeAttribute('data-component-editable');
  });
}

/**
 * iframe/document에서 DB 저장용 본문 HTML 추출 (body/article innerHTML)
 */
export function extractPersistableHtml(doc: Document): string {
  const root = selectContentRoot(doc);
  const clone = root.cloneNode(true) as Element;
  sanitizeContentRoot(clone);
  return clone.innerHTML.trim();
}

/**
 * HTML 문자열에서 DB 저장용 본문 추출
 */
export function extractPersistableHtmlFromString(html: string): string {
  if (!html?.trim()) {
    return html;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return extractPersistableHtml(doc);
}

/**
 * iframe document에서 DB 저장용 HTML 추출
 */
export function extractPersistableHtmlFromIframeDoc(
  iframeDoc: Document,
): string {
  return extractPersistableHtml(iframeDoc);
}

/**
 * fragment HTML을 iframe srcDoc/write용 최소 문서로 감싸기
 */
export function wrapHtmlForEditor(html: string): string {
  const trimmed = html?.trim() ?? '';
  if (!trimmed) {
    return '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';
  }
  if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return html;
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
}

/**
 * 에디터 표시용: fragment 저장본은 wrap, full document는 그대로 유지
 */
export function prepareHtmlForEditorDisplay(html: string): string {
  const trimmed = html?.trim() ?? '';
  if (!trimmed) {
    return wrapHtmlForEditor('');
  }
  if (/^<!DOCTYPE/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return html;
  }
  return wrapHtmlForEditor(trimmed);
}
