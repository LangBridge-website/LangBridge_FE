import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableColumn } from '../components/Table';
import { colors } from '../constants/designTokens';
import { termApi, TermDictionaryResponse, CreateTermRequest, UpdateTermRequest } from '../services/termApi';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useUser } from '../contexts/UserContext';
import { UserRole } from '../types/user';

const languageOptions = [
  { value: 'EN', label: '영어' },
  { value: 'KO', label: '한국어' },
  { value: 'JA', label: '일본어' },
  { value: 'ZH', label: '중국어' },
  { value: 'ES', label: '스페인어' },
  { value: 'FR', label: '프랑스어' },
  { value: 'DE', label: '독일어' },
];

export default function GlossaryManage() {
  const { user } = useUser();
  const [terms, setTerms] = useState<TermDictionaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSourceLang, setSelectedSourceLang] = useState<string>('');
  const [selectedTargetLang, setSelectedTargetLang] = useState<string>('');
  
  // 모달 상태
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<TermDictionaryResponse | null>(null);
  
  // 폼 상태
  const [formData, setFormData] = useState<CreateTermRequest>({
    sourceTerm: '',
    targetTerm: '',
    sourceLang: 'EN',
    targetLang: 'KO',
    description: '',
  });

  const isAdmin = user?.role === UserRole.SUPER_ADMIN || user?.role === UserRole.ADMIN;

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        setLoading(true);
        const params: { sourceLang?: string; targetLang?: string } = {};
        if (selectedSourceLang) params.sourceLang = selectedSourceLang;
        if (selectedTargetLang) params.targetLang = selectedTargetLang;
        const response = await termApi.getAllTerms(params);
        setTerms(response);
      } catch (error) {
        console.error('용어 목록 조회 실패:', error);
        setTerms([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTerms();
  }, [selectedSourceLang, selectedTargetLang]);

  const filteredTerms = useMemo(() => {
    if (!searchTerm.trim()) return terms;
    const term = searchTerm.toLowerCase();
    return terms.filter(
      (t) =>
        t.sourceTerm.toLowerCase().includes(term) ||
        t.targetTerm.toLowerCase().includes(term) ||
        (t.description && t.description.toLowerCase().includes(term))
    );
  }, [terms, searchTerm]);

  const handleAddClick = () => {
    setFormData({
      sourceTerm: '',
      targetTerm: '',
      sourceLang: 'EN',
      targetLang: 'KO',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  const handleEditClick = (term: TermDictionaryResponse) => {
    setSelectedTerm(term);
    setFormData({
      sourceTerm: term.sourceTerm,
      targetTerm: term.targetTerm,
      sourceLang: term.sourceLang,
      targetLang: term.targetLang,
      description: term.description || '',
    });
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (term: TermDictionaryResponse) => {
    setSelectedTerm(term);
    setIsDeleteModalOpen(true);
  };

  const handleAddConfirm = async () => {
    try {
      const response = await termApi.createTerm(formData);
      setIsAddModalOpen(false);
      setFormData({
        sourceTerm: '',
        targetTerm: '',
        sourceLang: 'EN',
        targetLang: 'KO',
        description: '',
      });
      // 목록 새로고침
      const updatedTerms = await termApi.getAllTerms();
      setTerms(updatedTerms);
      
      // DeepL 연동 상태에 따른 메시지
      if (response.deeplGlossaryId) {
        alert(`용어가 추가되었습니다.\n\nDeepL 연동: 성공\nGlossary ID: ${response.deeplGlossaryId.substring(0, 8)}...`);
      } else {
        alert('용어가 추가되었습니다.\n\nDeepL 연동: 대기 중 (잠시 후 자동으로 연동됩니다)');
      }
    } catch (error) {
      console.error('용어 추가 실패:', error);
      alert('용어 추가에 실패했습니다.');
    }
  };

  const handleEditConfirm = async () => {
    if (!selectedTerm) return;
    try {
      const response = await termApi.updateTerm(selectedTerm.id, formData);
      setIsEditModalOpen(false);
      setSelectedTerm(null);
      // 목록 새로고침
      const updatedTerms = await termApi.getAllTerms();
      setTerms(updatedTerms);
      
      // DeepL 연동 상태에 따른 메시지
      if (response.deeplGlossaryId) {
        alert(`용어가 수정되었습니다.\n\nDeepL 연동: 성공\nGlossary ID: ${response.deeplGlossaryId.substring(0, 8)}...`);
      } else {
        alert('용어가 수정되었습니다.\n\nDeepL 연동: 대기 중 (잠시 후 자동으로 연동됩니다)');
      }
    } catch (error) {
      console.error('용어 수정 실패:', error);
      alert('용어 수정에 실패했습니다.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTerm) return;
    try {
      await termApi.deleteTerm(selectedTerm.id);
      setIsDeleteModalOpen(false);
      setSelectedTerm(null);
      // 목록 새로고침
      const response = await termApi.getAllTerms();
      setTerms(response);
      alert('용어가 삭제되었습니다.');
    } catch (error) {
      console.error('용어 삭제 실패:', error);
      alert('용어 삭제에 실패했습니다.');
    }
  };

  const columns: TableColumn<TermDictionaryResponse>[] = [
    {
      key: 'sourceTerm',
      label: '원문 용어',
      width: '20%',
      render: (item) => (
        <span style={{ fontWeight: 500, color: '#000000' }}>{item.sourceTerm}</span>
      ),
    },
    {
      key: 'targetTerm',
      label: '번역 용어',
      width: '20%',
      render: (item) => (
        <span style={{ fontWeight: 500, color: '#000000' }}>{item.targetTerm}</span>
      ),
    },
    {
      key: 'languages',
      label: '언어',
      width: '10%',
      render: (item) => (
        <span style={{ color: colors.primaryText, fontSize: '12px' }}>
          {item.sourceLang} → {item.targetLang}
        </span>
      ),
    },
    {
      key: 'description',
      label: '설명',
      width: '20%',
      render: (item) => (
        <span style={{ color: colors.primaryText, fontSize: '12px' }}>
          {item.description || '-'}
        </span>
      ),
    },
    {
      key: 'deeplStatus',
      label: 'DeepL 연동',
      width: '12%',
      render: (item) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {item.deeplGlossaryId ? (
            <>
              <span style={{ 
                color: '#28a745', 
                fontSize: '12px',
                fontWeight: 500 
              }}>
                ✓ 연동됨
              </span>
              <span 
                style={{ 
                  color: colors.primaryText, 
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  cursor: 'help'
                }} 
                title={item.deeplGlossaryId}
              >
                {item.deeplGlossaryId.substring(0, 8)}...
              </span>
            </>
          ) : (
            <span style={{ 
              color: '#dc3545', 
              fontSize: '12px' 
            }}>
              ✗ 미연동
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'createdBy',
      label: '작성자',
      width: '10%',
      render: (item) => (
        <span style={{ color: colors.primaryText, fontSize: '12px' }}>
          {item.createdBy?.name || '-'}
        </span>
      ),
    },
    {
      key: 'action',
      label: '액션',
      width: '13%',
      align: 'right',
      render: (item) => (
        <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
          <Button
            variant="secondary"
            onClick={() => handleEditClick(item)}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            수정
          </Button>
          <Button
            variant="danger"
            onClick={() => handleDeleteClick(item)}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            삭제
          </Button>
        </div>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <div
        style={{
          padding: '24px',
          backgroundColor: colors.primaryBackground,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#000000', marginBottom: '16px' }}>
            권한이 없습니다
          </h1>
          <p style={{ color: colors.primaryText }}>
            용어 관리 기능은 관리자만 사용할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '24px',
        backgroundColor: colors.primaryBackground,
        minHeight: '100vh',
      }}
    >
      <div
        style={{
          maxWidth: '1600px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: '#000000',
            }}
          >
            용어집 관리
          </h1>
          <Button onClick={handleAddClick}>
            용어 추가
          </Button>
        </div>

        {/* 검색 및 필터 바 */}
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <input
            type="text"
            placeholder="용어 검색 (원문, 번역, 설명)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              minWidth: '200px',
              padding: '8px 12px',
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: colors.surface,
              color: '#000000',
            }}
          />

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: colors.primaryText }}>원문 언어:</label>
            <select
              value={selectedSourceLang}
              onChange={(e) => setSelectedSourceLang(e.target.value)}
              style={{
                padding: '6px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: colors.surface,
                color: '#000000',
                cursor: 'pointer',
              }}
            >
              <option value="">전체</option>
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <label style={{ fontSize: '13px', color: colors.primaryText }}>번역 언어:</label>
            <select
              value={selectedTargetLang}
              onChange={(e) => setSelectedTargetLang(e.target.value)}
              style={{
                padding: '6px 12px',
                border: `1px solid ${colors.border}`,
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: colors.surface,
                color: '#000000',
                cursor: 'pointer',
              }}
            >
              <option value="">전체</option>
              {languageOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 테이블 */}
        {loading ? (
          <div
            style={{
              padding: '48px',
              textAlign: 'center',
              color: colors.primaryText,
              fontSize: '13px',
            }}
          >
            로딩 중...
          </div>
        ) : (
          <Table
            columns={columns}
            data={filteredTerms}
            emptyMessage="용어가 없습니다."
          />
        )}

        {/* 용어 추가 모달 */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="용어 추가"
          onConfirm={handleAddConfirm}
          confirmText="추가"
          cancelText="취소"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                원문 용어 *
              </label>
              <input
                type="text"
                value={formData.sourceTerm}
                onChange={(e) => setFormData({ ...formData, sourceTerm: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                번역 용어 *
              </label>
              <input
                type="text"
                value={formData.targetTerm}
                onChange={(e) => setFormData({ ...formData, targetTerm: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                  원문 언어 *
                </label>
                <select
                  value={formData.sourceLang}
                  onChange={(e) => setFormData({ ...formData, sourceLang: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  required
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                  번역 언어 *
                </label>
                <select
                  value={formData.targetLang}
                  onChange={(e) => setFormData({ ...formData, targetLang: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  required
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        </Modal>

        {/* 용어 수정 모달 */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTerm(null);
          }}
          title="용어 수정"
          onConfirm={handleEditConfirm}
          confirmText="수정"
          cancelText="취소"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                원문 용어 *
              </label>
              <input
                type="text"
                value={formData.sourceTerm}
                onChange={(e) => setFormData({ ...formData, sourceTerm: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                번역 용어 *
              </label>
              <input
                type="text"
                value={formData.targetTerm}
                onChange={(e) => setFormData({ ...formData, targetTerm: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
                required
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                  원문 언어 *
                </label>
                <select
                  value={formData.sourceLang}
                  onChange={(e) => setFormData({ ...formData, sourceLang: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  required
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                  번역 언어 *
                </label>
                <select
                  value={formData.targetLang}
                  onChange={(e) => setFormData({ ...formData, targetLang: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                  required
                >
                  {languageOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: colors.primaryText }}>
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        </Modal>

        {/* 용어 삭제 모달 */}
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedTerm(null);
          }}
          title="용어 삭제 확인"
          onConfirm={handleDeleteConfirm}
          confirmText="삭제"
          cancelText="취소"
          variant="danger"
        >
          <p>
            정말로 "{selectedTerm?.sourceTerm}" → "{selectedTerm?.targetTerm}" 용어를 삭제하시겠습니까?
            <br />
            이 작업은 되돌릴 수 없습니다.
          </p>
        </Modal>
      </div>
    </div>
  );
}

