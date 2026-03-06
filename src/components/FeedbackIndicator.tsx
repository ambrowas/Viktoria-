import React from 'react';

type FeedbackStatus = 'correct' | 'incorrect' | null;

interface FeedbackIndicatorProps {
  status: FeedbackStatus;
}

const FeedbackIndicator: React.FC<FeedbackIndicatorProps> = ({ status }) => {
  if (!status) return null;

  const isCorrect = status === 'correct';
  const config = {
    bgColor: isCorrect ? 'bg-green-500' : 'bg-red-500',
    textColor: 'text-white',
    icon: isCorrect ? '✔' : '✖',
  };

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center bg-opacity-70 z-50 ${config.bgColor}`}
    >
      <div className="text-center">
        <div className="text-9xl animate-bounce">{config.icon}</div>
      </div>
    </div>
  );
};

export default FeedbackIndicator;
