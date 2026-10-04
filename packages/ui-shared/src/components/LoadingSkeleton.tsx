import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className = '' }) => {
  return (
    <div
      className={`animate-pulse bg-[#E8DED5] rounded-md ${className}`}
      style={{ minHeight: '20px' }}
      role="status"
      aria-label="Loading..."
    />
  );
};
