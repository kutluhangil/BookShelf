import React from 'react';
import { ConfidenceLevel } from '../types';

interface ConfidenceBadgeProps {
  level: ConfidenceLevel | 'failed';
  score?: number;
  showScore?: boolean;
  className?: string;
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  level,
  score,
  showScore = false,
  className = '',
}) => {
  const normalizedLevel = level === 'failed' ? 'unknown' : level;

  const config = {
    matched: {
      label: 'MATCHED',
      barColor: 'bg-[#6E8F6A]',
      textColor: 'text-[#C8ECC1]',
      bgTint: 'bg-[#304E2E]/30',
      borderTint: 'border-[#6E8F6A]/40',
    },
    review: {
      label: 'REVIEW',
      barColor: 'bg-[#C9963F]',
      textColor: 'text-[#F5BD62]',
      bgTint: 'bg-[#C9963F]/20',
      borderTint: 'border-[#C9963F]/40',
    },
    unknown: {
      label: level === 'failed' ? 'FAILED' : 'UNKNOWN',
      barColor: 'bg-[#A9503F]',
      textColor: 'text-[#FFB4AB]',
      bgTint: 'bg-[#93000A]/20',
      borderTint: 'border-[#A9503F]/40',
    },
  }[normalizedLevel];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`inline-flex items-center rounded px-2 py-0.5 border ${config.borderTint} ${config.bgTint} hairline-border`}>
        <div className={`w-[3px] h-3.5 ${config.barColor} mr-1.5 rounded-full`} />
        <span className={`font-mono-ibm text-[11px] font-semibold tracking-[0.1em] uppercase ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      {showScore && score !== undefined && (
        <span className="font-mono-ibm text-[11px] text-[#A79C8C] tracking-wider">
          CONF: {score.toFixed(2)}
        </span>
      )}
    </div>
  );
};
