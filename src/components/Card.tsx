import React, { ReactNode } from 'react';

export type CardPriority = 'primary' | 'normal' | 'secondary';

interface CardProps {
  children: ReactNode;
  priority?: CardPriority;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, priority = 'normal', className = '' }) => {
  const getCardStyles = () => {
    switch (priority) {
      case 'primary':
        return {
          background: '#DCDCDC', // gainsboro - 예전 버전
          border: '1px solid #A9A9A9',
        };
      case 'secondary':
        return {
          background: '#D3D3D3', // lightgray - 현재 버전 (번역 가이드용)
          border: '1px solid #D3D3D3',
        };
      default: // normal
        return {
          background: '#DCDCDC', // gainsboro - 예전 버전
          border: '1px solid #C0C0C0',
        };
    }
  };

  const styles = getCardStyles();

  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        background: styles.background,
        border: styles.border,
        borderRadius: '8px',
        padding: '16px',
      }}
    >
      {children}
    </div>
  );
};

