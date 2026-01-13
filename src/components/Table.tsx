import React from 'react';
import { colors } from '../constants/designTokens';

export interface TableColumn<T> {
  key: string;
  label: string;
  width?: string;
  render: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (item: T, index: number) => void;
  emptyMessage?: string;
}

export function Table<T extends { id: number | string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = '데이터가 없습니다.',
}: TableProps<T>) {
  return (
    <div
      style={{
        width: '100%',
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* 테이블 헤더 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: columns.map((col) => col.width || '1fr').join(' '),
          backgroundColor: colors.sidebarBackground,
          borderBottom: `1px solid ${colors.border}`,
          padding: '12px 16px',
          fontWeight: 600,
          fontSize: '13px',
          color: '#000000',
          gap: '8px',
        }}
      >
        {columns.map((col) => (
          <div
            key={col.key}
            style={{
              textAlign: col.align || 'left',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {col.label}
          </div>
        ))}
      </div>

      {/* 테이블 본문 */}
      <div>
        {data.length === 0 ? (
          <div
            style={{
              padding: '48px 16px',
              textAlign: 'center',
              color: colors.primaryText,
              fontSize: '13px',
            }}
          >
            {emptyMessage}
          </div>
        ) : (
          data.map((item, index) => (
            <div
              key={item.id}
              onClick={() => onRowClick?.(item, index)}
              style={{
                display: 'grid',
                gridTemplateColumns: columns.map((col) => col.width || '1fr').join(' '),
                padding: '16px',
                borderBottom: `1px solid ${colors.border}`,
                fontSize: '13px',
                color: '#000000',
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background-color 150ms',
                backgroundColor: colors.surface,
                gap: '8px',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = '#F5F5F5';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = colors.surface;
              }}
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  style={{
                    textAlign: col.align || 'left',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {col.render(item, index)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

