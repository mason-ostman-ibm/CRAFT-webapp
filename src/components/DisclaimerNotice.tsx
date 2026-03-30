import React from 'react';
import { InlineNotification } from '@carbon/react';

interface DisclaimerNoticeProps {
  style?: React.CSSProperties;
}

const DisclaimerNotice: React.FC<DisclaimerNoticeProps> = ({ style }) => {
  return (
    <InlineNotification
      kind="info"
      title="Important Notice"
      subtitle="These AI-generated answers are intended to provide a head start and should not be considered final or complete. Please review, validate, and customize all responses before submission."
      hideCloseButton
      lowContrast
      style={style}
    />
  );
};

export default DisclaimerNotice;

// Made with Bob
