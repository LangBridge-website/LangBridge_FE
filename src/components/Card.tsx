import React, { ReactNode } from 'react';
import { colors } from '../constants/designTokens';

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
          background: colors.surface,
          border: `1px solid ${colors.border}`,
        };
      case 'secondary':
        return {
          background: colors.surface,
          border: `1px solid ${colors.border}`,
        };
      default:
        return {
          background: colors.surface,
          border: `1px solid ${colors.border}`,
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
