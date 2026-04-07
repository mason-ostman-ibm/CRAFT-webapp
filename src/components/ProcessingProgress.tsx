import React from 'react';
import { ProgressBar, Tile, Stack } from '@carbon/react';
import { Renew, Time } from '@carbon/icons-react';

interface ProcessingProgressProps {
  progress: number;
  timeRemaining: number | null;
  statusMessage: string;
  questionCount?: number;
  elapsedTime?: number;
}

const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  progress,
  timeRemaining,
  statusMessage,
  questionCount,
  elapsedTime,
}) => {
  // Format time in a human-readable way
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.ceil(seconds)}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.ceil(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  // Determine processing stage based on progress
  const getStage = (): string => {
    if (progress < 5) return 'Queuing job...';
    if (progress < 15) return 'Analyzing document structure...';
    if (progress < 90) return 'Processing questions with AI...';
    return 'Finalizing results...';
  };

  const stage = getStage();
  const displayProgress = Math.min(Math.max(progress, 0), 95); // Cap at 95% until complete

  return (
    <Tile style={{ backgroundColor: '#262626', padding: '2rem', marginTop: '1rem' }}>
      <Stack gap={5}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Renew size={24} style={{ animation: 'spin 2s linear infinite' }} />
          <h4 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>
            Processing with AI
          </h4>
        </div>

        {/* Progress Bar */}
        <div>
          <ProgressBar
            label="Processing Progress"
            value={displayProgress}
            max={100}
            size="big"
            helperText={stage}
          />
        </div>

        {/* Stats Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginTop: '0.5rem',
          }}
        >
          {/* Progress Percentage */}
          <div
            style={{
              backgroundColor: '#393939',
              padding: '1rem',
              borderRadius: '4px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#78a9ff' }}>
              {Math.round(displayProgress)}%
            </div>
            <div style={{ fontSize: '0.875rem', color: '#c6c6c6', marginTop: '0.25rem' }}>
              Complete
            </div>
          </div>

          {/* Time Remaining */}
          {timeRemaining !== null && timeRemaining > 0 && (
            <div
              style={{
                backgroundColor: '#393939',
                padding: '1rem',
                borderRadius: '4px',
                textAlign: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Time size={20} style={{ color: '#ff832b' }} />
                <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#ff832b' }}>
                  {formatTime(timeRemaining)}
                </div>
              </div>
              <div style={{ fontSize: '0.875rem', color: '#c6c6c6', marginTop: '0.25rem' }}>
                Estimated Remaining
              </div>
            </div>
          )}

          {/* Elapsed Time */}
          {elapsedTime !== undefined && elapsedTime > 0 && (
            <div
              style={{
                backgroundColor: '#393939',
                padding: '1rem',
                borderRadius: '4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#42be65' }}>
                {formatTime(elapsedTime)}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#c6c6c6', marginTop: '0.25rem' }}>
                Elapsed Time
              </div>
            </div>
          )}

          {/* Question Count */}
          {questionCount && (
            <div
              style={{
                backgroundColor: '#393939',
                padding: '1rem',
                borderRadius: '4px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: '#be95ff' }}>
                {questionCount}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#c6c6c6', marginTop: '0.25rem' }}>
                Questions to Process
              </div>
            </div>
          )}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: '#393939',
              borderRadius: '4px',
              borderLeft: '3px solid #78a9ff',
            }}
          >
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#f4f4f4' }}>
              {statusMessage}
            </p>
          </div>
        )}

        {/* Info Note */}
        <p style={{ fontSize: '0.75rem', color: '#8d8d8d', margin: 0, fontStyle: 'italic' }}>
          💡 Progress is tracked in real-time as each question is processed.
          Time estimates are calculated based on actual processing rate.
        </p>
      </Stack>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </Tile>
  );
};

export default ProcessingProgress;

// Made with Bob
