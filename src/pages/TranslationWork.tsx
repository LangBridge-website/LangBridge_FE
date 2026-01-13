import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { translationWorkApi, LockStatusResponse } from '../services/translationWorkApi';
import { documentApi, DocumentResponse } from '../services/documentApi';
import { documentApi as docApi, DocumentVersionResponse } from '../services/documentApi';
import { colors } from '../constants/designTokens';
import { Button } from '../components/Button';
import {
  extractParagraphs,
  getParagraphs,
  getParagraphAtScrollPosition,
  highlightParagraph,
  clearAllHighlights,
  Paragraph,
} from '../utils/paragraphUtils';
import './TranslationWork.css';

export default function TranslationWork() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const documentId = id ? parseInt(id, 10) : null;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lockStatus, setLockStatus] = useState<LockStatusResponse | null>(null);
  const [document, setDocument] = useState<DocumentResponse | null>(null);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [aiDraftContent, setAiDraftContent] = useState<string>('');
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const [completedParagraphs, setCompletedParagraphs] = useState<Set<number>>(new Set());
  const [highlightedParagraphIndex, setHighlightedParagraphIndex] = useState<number | null>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverMemo, setHandoverMemo] = useState('');
  const [handoverTerms, setHandoverTerms] = useState('');

  // 패널 refs
  const originalPanelRef = useRef<HTMLDivElement>(null);
  const aiDraftPanelRef = useRef<HTMLDivElement>(null);
  const editorPanelRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'AI 초벌 번역 내용을 편집하세요...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'translation-editor',
        style: 'min-height: 400px; padding: 16px; font-size: 13px; line-height: 1.6; color: #000000; outline: none;',
      },
    },
  });

  // 초기 데이터 로드
  useEffect(() => {
    if (!documentId) {
      setError('문서 ID가 없습니다.');
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1. 문서 정보 가져오기
        const doc = await documentApi.getDocument(documentId);
        setDocument(doc);

        // 2. 락 획득 시도
        try {
          const lock = await translationWorkApi.acquireLock(documentId);
          setLockStatus(lock);
          if (!lock.canEdit) {
            setError(`이 문서는 ${lock.lockedBy?.name}님이 작업 중입니다.`);
            setLoading(false);
            return;
          }
        } catch (lockError: any) {
          if (lockError.response?.status === 409) {
            // 이미 락이 있는 경우 상태만 확인
            const status = await translationWorkApi.getLockStatus(documentId);
            setLockStatus(status);
            if (!status.canEdit) {
              setError(`이 문서는 ${status.lockedBy?.name}님이 작업 중입니다.`);
              setLoading(false);
              return;
            }
          } else {
            throw lockError;
          }
        }

        // 3. 버전 정보 가져오기
        try {
          const versions = await docApi.getDocumentVersions(documentId);
          
          // ORIGINAL 버전 찾기
          const originalVersion = versions.find(v => v.versionType === 'ORIGINAL');
          if (originalVersion) {
            // 문단 ID 부여
            const processedOriginal = extractParagraphs(originalVersion.content, 'original');
            setOriginalContent(processedOriginal);
          }

          // AI_DRAFT 버전 찾기
          const aiDraftVersion = versions.find(v => v.versionType === 'AI_DRAFT');
          if (aiDraftVersion) {
            // 문단 ID 부여
            const processedAiDraft = extractParagraphs(aiDraftVersion.content, 'ai-draft');
            setAiDraftContent(processedAiDraft);
            // 에디터에 AI 초벌 번역 내용 설정 (에디터용으로도 문단 ID 부여)
            if (editor) {
              const editorContent = extractParagraphs(aiDraftVersion.content, 'editor');
              editor.commands.setContent(editorContent);
            }
          } else if (originalVersion) {
            // AI_DRAFT가 없으면 ORIGINAL을 기본값으로
            const processedOriginal = extractParagraphs(originalVersion.content, 'ai-draft');
            setAiDraftContent(processedOriginal);
            if (editor) {
              const editorContent = extractParagraphs(originalVersion.content, 'editor');
              editor.commands.setContent(editorContent);
            }
          }

          // 문단 개수 계산
          setTimeout(() => {
            if (originalPanelRef.current) {
              const paragraphs = getParagraphs(originalPanelRef.current);
              setProgress((prev) => ({ ...prev, total: paragraphs.length }));
            }
          }, 100);
        } catch (versionError) {
          console.error('버전 정보 조회 실패:', versionError);
        }

      } catch (err: any) {
        console.error('데이터 로드 실패:', err);
        setError(err.response?.data?.message || err.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [documentId, editor]);

  // 에디터 내용 변경 시 문단 ID 업데이트
  useEffect(() => {
    if (!editor) return;

    let updateTimeout: NodeJS.Timeout;

    const updateParagraphIds = () => {
      const html = editor.getHTML();
      const editorContent = editorPanelRef.current?.querySelector('.ProseMirror');
      
      // 이미 문단 ID가 있는지 확인
      if (editorContent) {
        const existingParas = editorContent.querySelectorAll('[data-paragraph-index]');
        if (existingParas.length === 0) {
          // 문단 ID가 없으면 추가
          const processed = extractParagraphs(html, 'editor');
          if (html !== processed) {
            const { from } = editor.state.selection;
            editor.commands.setContent(processed, false);
            // 커서 위치 복원 시도
            setTimeout(() => {
              try {
                const newDoc = editor.state.doc;
                const safePos = Math.min(from, newDoc.content.size);
                editor.commands.setTextSelection(safePos);
              } catch (e) {
                // 무시
              }
            }, 10);
          }
        }
      }
    };

    // 에디터 업데이트 이벤트 리스너 (디바운스)
    const handleUpdate = () => {
      clearTimeout(updateTimeout);
      updateTimeout = setTimeout(updateParagraphIds, 300);
    };

    editor.on('update', handleUpdate);

    return () => {
      clearTimeout(updateTimeout);
      editor.off('update', handleUpdate);
    };
  }, [editor]);

  // 에디터 내용 변경 시 자동 저장 (디바운스)
  useEffect(() => {
    if (!editor || !documentId) return;

    const timeoutId = setTimeout(async () => {
      const content = editor.getHTML();
      try {
        await translationWorkApi.saveTranslation(documentId, {
          content,
          completedParagraphs: Array.from(completedParagraphs),
        });
        console.log('💾 자동 저장 완료');
      } catch (error) {
        console.error('자동 저장 실패:', error);
      }
    }, 2000); // 2초 후 저장

    return () => clearTimeout(timeoutId);
  }, [editor?.getHTML(), documentId, completedParagraphs]);

  // 스크롤 동기화
  const syncScroll = useCallback((sourcePanel: HTMLDivElement, targetPanels: HTMLDivElement[]) => {
    if (isScrollingRef.current) return;

    isScrollingRef.current = true;
    const maxScroll = sourcePanel.scrollHeight - sourcePanel.clientHeight;
    const scrollRatio = maxScroll > 0 ? sourcePanel.scrollTop / maxScroll : 0;

    targetPanels.forEach((panel) => {
      const panelMaxScroll = panel.scrollHeight - panel.clientHeight;
      if (panelMaxScroll > 0) {
        panel.scrollTop = scrollRatio * panelMaxScroll;
      }
    });

    // 현재 스크롤 위치의 문단 찾기
    const currentPara = getParagraphAtScrollPosition(sourcePanel, sourcePanel.scrollTop);
    if (currentPara) {
      setHighlightedParagraphIndex(currentPara.index);
    }

    setTimeout(() => {
      isScrollingRef.current = false;
    }, 50);
  }, []);

  // 마우스 호버로 문단 하이라이트
  const handleParagraphHover = useCallback((index: number) => {
    setHighlightedParagraphIndex(index);
  }, []);

  const handleParagraphLeave = useCallback(() => {
    // 호버 해제 시 하이라이트 유지 (스크롤 위치 기반)
    // 필요시 null로 설정하여 하이라이트 제거 가능
  }, []);

  // 문단 하이라이트 및 완료 상태 동기화
  useEffect(() => {
    const applyParagraphStyles = (panel: HTMLElement | null) => {
      if (!panel) return;
      clearAllHighlights(panel);
      
      const paragraphs = getParagraphs(panel);
      paragraphs.forEach((para) => {
        const isHighlighted = para.index === highlightedParagraphIndex;
        const isComplete = completedParagraphs.has(para.index);
        
        if (isHighlighted) {
          highlightParagraph(para.element, true);
        }
        
        if (isComplete) {
          para.element.style.opacity = '0.7';
          para.element.style.textDecoration = 'line-through';
          para.element.style.color = colors.secondaryText;
        } else {
          para.element.style.opacity = '';
          para.element.style.textDecoration = '';
          para.element.style.color = '';
        }
      });
    };

    applyParagraphStyles(originalPanelRef.current);
    applyParagraphStyles(aiDraftPanelRef.current);
    
    // 에디터 내부 문단 스타일 적용
    if (editorPanelRef.current) {
      const editorContent = editorPanelRef.current.querySelector('.ProseMirror');
      if (editorContent) {
        applyParagraphStyles(editorContent as HTMLElement);
      }
    }
  }, [highlightedParagraphIndex, completedParagraphs]);

  // 문단 완료 체크 토글
  const toggleParagraphComplete = useCallback((index: number) => {
    setCompletedParagraphs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      setProgress((p) => ({ ...p, completed: newSet.size }));
      return newSet;
    });
  }, []);

  // 진행률 업데이트
  useEffect(() => {
    setProgress((prev) => ({ ...prev, completed: completedParagraphs.size }));
  }, [completedParagraphs]);

  const handleHandover = () => {
    setShowHandoverModal(true);
  };

  const confirmHandover = async () => {
    if (!documentId || !handoverMemo.trim()) {
      alert('남은 작업 메모를 입력해주세요.');
      return;
    }

    try {
      await translationWorkApi.handover(documentId, {
        memo: handoverMemo.trim(),
        terms: handoverTerms.trim() || undefined,
        completedParagraphs: Array.from(completedParagraphs),
      });
      alert('인계가 완료되었습니다.');
      navigate('/translations/pending');
    } catch (error: any) {
      alert('인계 실패: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleComplete = async () => {
    if (!documentId || !editor) return;

    if (!window.confirm('번역을 완료하시겠습니까? 완료 후 검토 대기 상태로 변경됩니다.')) {
      return;
    }

    try {
      const content = editor.getHTML();
      await translationWorkApi.completeTranslation(documentId, {
        content,
        completedParagraphs: Array.from(completedParagraphs),
      });
      alert('번역이 완료되었습니다!');
      navigate('/translations/pending');
    } catch (error: any) {
      alert('완료 처리 실패: ' + (error.response?.data?.message || error.message));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: colors.primaryText }}>
        로딩 중...
      </div>
    );
  }

  if (error && !lockStatus?.canEdit) {
    return (
      <div style={{ padding: '48px' }}>
        <div
          style={{
            padding: '16px',
            backgroundColor: '#F5F5F5',
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            color: colors.primaryText,
          }}
        >
          ⚠️ {error}
        </div>
        <div style={{ marginTop: '16px' }}>
          <Button variant="secondary" onClick={() => navigate('/translations/pending')}>
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: colors.primaryBackground,
      }}
    >
      {/* 상단 고정 바 */}
      <div
        style={{
          padding: '12px 24px',
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {lockStatus?.locked && lockStatus.canEdit && (
            <div
              style={{
                padding: '4px 12px',
                backgroundColor: '#C0C0C0',
                color: '#000000',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              🔒 현재 당신이 이 문서를 번역 중입니다
            </div>
          )}
          <div style={{ fontSize: '13px', color: colors.primaryText }}>
            진행률: {progress.completed}/{progress.total} 문단 완료 (
            {progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0}%)
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button variant="secondary" onClick={handleHandover} style={{ fontSize: '12px' }}>
            인계 요청
          </Button>
          <Button variant="primary" onClick={handleComplete} style={{ fontSize: '12px' }}>
            번역 완료
          </Button>
        </div>
      </div>

      {/* 3단 레이아웃 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '33% 33% 34%',
          flex: 1,
          overflow: 'hidden',
        }}
      >
        {/* 원문 패널 */}
        <div
          ref={originalPanelRef}
          onScroll={(e) => {
            const panel = e.currentTarget;
            const panels = [aiDraftPanelRef.current, editorPanelRef.current].filter(Boolean) as HTMLDivElement[];
            syncScroll(panel, panels);
          }}
          style={{
            borderRight: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            overflow: 'auto',
            padding: '16px',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>원문</h3>
          <div
            dangerouslySetInnerHTML={{ __html: originalContent }}
            onMouseOver={(e) => {
              const target = e.target as HTMLElement;
              const paraElement = target.closest('[data-paragraph-index]');
              if (paraElement) {
                const index = parseInt(paraElement.getAttribute('data-paragraph-index') || '0', 10);
                handleParagraphHover(index);
              }
            }}
            style={{
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#000000',
            }}
          />
        </div>

        {/* AI 초벌 번역 패널 */}
        <div
          ref={aiDraftPanelRef}
          onScroll={(e) => {
            const panel = e.currentTarget;
            const panels = [originalPanelRef.current, editorPanelRef.current].filter(Boolean) as HTMLDivElement[];
            syncScroll(panel, panels);
          }}
          style={{
            borderRight: `1px solid ${colors.border}`,
            backgroundColor: colors.surface,
            overflow: 'auto',
            padding: '16px',
          }}
        >
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>AI 초벌 번역</h3>
          <div
            dangerouslySetInnerHTML={{ __html: aiDraftContent }}
            onMouseOver={(e) => {
              const target = e.target as HTMLElement;
              const paraElement = target.closest('[data-paragraph-index]');
              if (paraElement) {
                const index = parseInt(paraElement.getAttribute('data-paragraph-index') || '0', 10);
                handleParagraphHover(index);
              }
            }}
            style={{
              fontSize: '13px',
              lineHeight: 1.6,
              color: '#000000',
            }}
          />
        </div>

        {/* 내 번역 패널 (에디터) */}
        <div
          ref={editorPanelRef}
          onScroll={(e) => {
            const panel = e.currentTarget;
            const panels = [originalPanelRef.current, aiDraftPanelRef.current].filter(Boolean) as HTMLDivElement[];
            syncScroll(panel, panels);
          }}
          style={{
            backgroundColor: colors.surface,
            overflow: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>내 번역</h3>
            {highlightedParagraphIndex !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: colors.primaryText, cursor: 'pointer' }}>
                  문단 {highlightedParagraphIndex + 1} 완료:
                </label>
                <input
                  type="checkbox"
                  checked={completedParagraphs.has(highlightedParagraphIndex)}
                  onChange={() => toggleParagraphComplete(highlightedParagraphIndex)}
                  style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
              </div>
            )}
          </div>
          {editor ? (
            <div
              onClick={(e) => {
                const target = e.target as HTMLElement;
                const paraElement = target.closest('[data-paragraph-index]');
                if (paraElement) {
                  const index = parseInt(paraElement.getAttribute('data-paragraph-index') || '0', 10);
                  handleParagraphHover(index);
                }
              }}
            >
              <EditorContent editor={editor} />
            </div>
          ) : (
            <div style={{ color: colors.secondaryText }}>에디터 로딩 중...</div>
          )}
        </div>
      </div>

      {/* 인계 요청 모달 */}
      {showHandoverModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowHandoverModal(false)}
        >
          <div
            style={{
              backgroundColor: colors.surface,
              padding: '24px',
              borderRadius: '8px',
              width: '500px',
              maxWidth: '90vw',
              border: `1px solid ${colors.border}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
              인계 요청
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.primaryText }}>
                완료한 문단 범위 *
              </label>
              <div style={{ fontSize: '12px', color: colors.secondaryText, marginBottom: '8px' }}>
                완료된 문단: {completedParagraphs.size}개 / 전체: {progress.total}개
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.primaryText }}>
                남은 작업 메모 *
              </label>
              <textarea
                value={handoverMemo}
                onChange={(e) => setHandoverMemo(e.target.value)}
                placeholder="예: 15-30번 문단 남음, 전문 용어 주의 필요"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '8px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', color: colors.primaryText }}>
                주의 용어/표현 메모 (선택)
              </label>
              <textarea
                value={handoverTerms}
                onChange={(e) => setHandoverTerms(e.target.value)}
                placeholder="예: 'API'는 그대로 유지, '서버'는 'server'로 표기"
                style={{
                  width: '100%',
                  minHeight: '60px',
                  padding: '8px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '13px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowHandoverModal(false);
                  setHandoverMemo('');
                  setHandoverTerms('');
                }}
                style={{ fontSize: '12px' }}
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={confirmHandover}
                style={{ fontSize: '12px' }}
              >
                인계 요청
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

