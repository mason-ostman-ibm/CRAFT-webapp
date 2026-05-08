import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Column,
  Heading,
  Button,
  FileUploader,
  Loading,
  InlineNotification,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TextArea,
  Stack,
  Tag,
  Tile,
  ProgressBar,
} from '@carbon/react';
import { Download, Renew, CheckmarkFilled } from '@carbon/icons-react';
import DisclaimerNotice from '../components/DisclaimerNotice';
import ProcessingProgress from '../components/ProcessingProgress';

interface Question {
  question: string;
  answer: string;
  row: number;
}

interface UploadResponse {
  success: boolean;
  fileId: string;
  filePath: string;
  originalName: string;
  questions: Question[];
  totalQuestions: number;
}

interface QaPair {
  sheet: string;
  row: number;
  question: string;
  answer: string;
}

interface ProcessResult {
  success: boolean;
  questions_answered: number;
  sheets_processed: number;
  total_sheets: number;
  details: { sheet: string; questions_answered: number }[];
  download_filename: string;
  download_url: string;
  qa_pairs: QaPair[];
}

interface ServiceStatus {
  available: boolean;
  service: string;
  message?: string;
}

const ProcessPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [context, setContext] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Ref so the polling interval's stale closure can read the latest start time
  // without re-creating the interval. Without this, the closure always sees
  // `null` and re-sets start time on every poll, resetting elapsed time.
  const processingStartTimeRef = useRef<number | null>(null);

  // Progress tracking state
  const [processingStartTime, setProcessingStartTime] = useState<number | null>(null);
  const [estimatedProgress, setEstimatedProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [serverQuestionCount, setServerQuestionCount] = useState<number | null>(null);
  const [estimateBase, setEstimateBase] = useState<{ value: number; at: number } | null>(null);

  // Load service status on mount
  useEffect(() => {
    loadServiceStatus();
  }, []);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Smooth 1s tick for elapsed time and projected estimated-remaining,
  // independent of the 3s status poll cadence.
  useEffect(() => {
    if (!isProcessing || processingStartTime === null) return;
    const tick = () => {
      setElapsedTime((Date.now() - processingStartTime) / 1000);
      setEstimatedTimeRemaining(
        estimateBase
          ? Math.max(0, estimateBase.value - (Date.now() - estimateBase.at) / 1000)
          : null
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isProcessing, processingStartTime, estimateBase]);

  const loadServiceStatus = async () => {
    setIsCheckingHealth(true);
    try {
      const response = await fetch('/api/python/health');
      const data = await response.json();
      setServiceStatus(data);

      if (!data.available) {
        setError('Processing service is not available. The pod may still be starting up. Please wait a moment and refresh the page.');
      }
    } catch (err) {
      console.error('Error loading service status:', err);
      setError('Failed to check processing service status. The service may still be starting up.');
      setServiceStatus({ available: false, service: 'AI Processing Service' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const handleFileChange = (event: any) => {
    const files = event.target?.files || event.addedFiles;
    if (files && files.length > 0) {
      setFile(files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setUploadData(data);
        setSuccess(`File uploaded successfully! Found ${data.totalQuestions} questions.`);
      } else {
        setError(data.error || 'Failed to upload file');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please upload a file first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setProcessResult(null);
    setStatusMessage('Submitting job...');
    
    // Reset progress tracking
    processingStartTimeRef.current = null;
    setProcessingStartTime(null);
    setEstimatedProgress(0);
    setEstimatedTimeRemaining(null);
    setElapsedTime(0);
    setServerQuestionCount(null);
    setEstimateBase(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', context);

      const response = await fetch('/api/python/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to submit job');
        setIsProcessing(false);
        return;
      }

      const jobId: string = data.job_id;
      setStatusMessage('Job queued. Processing will start shortly...');

      // Track retry count for initial 404s (race condition handling)
      let retryCount = 0;
      const maxInitialRetries = 3;

      // Wait 1 second before first poll to avoid race condition
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Poll every 3 seconds until completed or failed
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/python/job/${jobId}/status`);
          
          // Handle 404 with retry logic for initial polls (race condition)
          if (statusRes.status === 404) {
            retryCount++;
            if (retryCount <= maxInitialRetries) {
              console.log(`Job ${jobId} not found yet, retry ${retryCount}/${maxInitialRetries}`);
              return; // Continue polling
            }
            // After max retries, stop polling
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setError('Job not found. It may have expired or failed to create.');
            setIsProcessing(false);
            return;
          }
          
          // Reset retry count on successful response
          retryCount = 0;
          
          // Stop polling on other HTTP errors
          if (!statusRes.ok) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setError(`Failed to check job status: ${statusRes.statusText}`);
            setIsProcessing(false);
            return;
          }
          
          const statusData = await statusRes.json();
          
          // Stop polling if no status field (malformed response)
          if (!statusData.status) {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setError('Invalid response from server. Job may not exist.');
            setIsProcessing(false);
            return;
          }

          if (statusData.message) {
            setStatusMessage(statusData.message);
          }

          // Start timer when processing begins. Use the ref so we don't
          // re-set it every poll (the interval's closure has a stale
          // `processingStartTime` of null).
          if (statusData.status === 'processing' && processingStartTimeRef.current === null) {
            const now = Date.now();
            processingStartTimeRef.current = now;
            setProcessingStartTime(now);
          }

          const startedAt = processingStartTimeRef.current;

          // Use real progress data from microservice if available
          if (statusData.progress) {
            const progress = statusData.progress;
            const pct = progress.percentage || 0;

            // Update progress with real data from microservice
            setEstimatedProgress(pct);

            // Authoritative question count from Python once it reports it
            if (typeof progress.total_questions === 'number' && progress.total_questions > 0) {
              setServerQuestionCount(progress.total_questions);
            }

            // Prefer a local extrapolation from actual elapsed time once we
            // have a meaningful percentage — the server's rate-based estimate
            // overshoots early because the rolling rate is still warming up.
            // Fall back to the server's value while pct is too small to project.
            let target: number | null = null;
            if (startedAt !== null && pct >= 5 && pct < 100) {
              const elapsedSec = (Date.now() - startedAt) / 1000;
              target = elapsedSec * (100 - pct) / pct;
            } else if (
              progress.estimated_time_remaining !== null &&
              progress.estimated_time_remaining !== undefined
            ) {
              target = progress.estimated_time_remaining;
            }

            if (target !== null) {
              const serverValue = target;
              setEstimateBase((prev) => {
                if (!prev) return { value: serverValue, at: Date.now() };
                const projected = Math.max(0, prev.value - (Date.now() - prev.at) / 1000);
                const delta = Math.abs(serverValue - projected);
                // Snap on meaningful corrections OR when our projection has
                // run past the new target (so we don't undershoot to 0 and
                // then leap back up).
                if (
                  serverValue < projected - 2 ||
                  (delta > 5 && delta > projected * 0.2)
                ) {
                  return { value: serverValue, at: Date.now() };
                }
                return prev;
              });
            } else {
              setEstimateBase(null);
            }

            // Update status message with current question if available
            if (progress.current_question && progress.stage === 'processing') {
              setStatusMessage(`Processing: ${progress.current_question.substring(0, 80)}...`);
            }
          } else if (startedAt !== null) {
            // Fallback to time-based estimation if no progress data
            const elapsed = (Date.now() - startedAt) / 1000;

            // Simple time-based progress estimation
            const estimatedTotal = 180; // 3 minutes estimate
            const calculatedProgress = Math.min((elapsed / estimatedTotal) * 95, 95);
            setEstimatedProgress(calculatedProgress);

            const remaining = Math.max(estimatedTotal - elapsed, 0);
            setEstimateBase(remaining > 0 ? { value: remaining, at: Date.now() } : null);
          }

          if (statusData.status === 'completed') {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;

            const result: ProcessResult = statusData.result;
            result.download_url = `/api/python/job/${jobId}/download`;
            setProcessResult(result);
            setDownloadUrl(result.download_url);
            setSuccess(
              `Processing complete! Answered ${result.questions_answered} questions across ${result.sheets_processed} sheet(s).`
            );
            setIsProcessing(false);
            setEstimatedProgress(100);
            setEstimatedTimeRemaining(0);
            setEstimateBase(null);
          } else if (statusData.status === 'failed') {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;
            setError(statusData.error || statusData.message || 'Processing failed');
            setIsProcessing(false);
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 3000);

    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Process error:', err);
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (downloadUrl) {
      window.location.href = downloadUrl;
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadData(null);
    setContext('');
    setError(null);
    setSuccess(null);
    setDownloadUrl(null);
    setProcessResult(null);
    
    // Reset progress tracking
    processingStartTimeRef.current = null;
    setProcessingStartTime(null);
    setEstimatedProgress(0);
    setEstimatedTimeRemaining(null);
    setElapsedTime(0);
    setServerQuestionCount(null);
    setEstimateBase(null);
  };

  return (
    <Grid className="page-content" fullWidth>
      <Column lg={16} md={8} sm={4}>
        <Stack gap={7}>
          <div style={{ marginTop: '3rem' }}>
            <Heading className="page-title">Process Excel Files</Heading>
            <p className="page-description" style={{ marginTop: '1rem' }}>
              Upload your Excel file and let AI generate professional answers for your questions.
            </p>
          </div>

          <DisclaimerNotice />

          {/* Service Status Check */}
          {isCheckingHealth && (
            <Tile style={{ backgroundColor: '#262626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Loading small withOverlay={false} />
                <div>
                  <Heading style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Checking Service Status</Heading>
                  <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>
                    Verifying that the AI processing service is ready...
                  </p>
                </div>
              </div>
            </Tile>
          )}

          {/* Service Status Display */}
          {!isCheckingHealth && serviceStatus && (
            <Tile style={{ backgroundColor: '#262626' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Heading style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Service Status</Heading>
                  <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>
                    {serviceStatus.available ? (
                      <span style={{ color: '#42be65' }}>✓ AI Processing Service is ready</span>
                    ) : (
                      <span style={{ color: '#ff832b' }}>⚠ AI Processing Service is starting up</span>
                    )}
                  </p>
                  {serviceStatus.message && (
                    <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginTop: '0.25rem' }}>
                      {serviceStatus.message}
                    </p>
                  )}
                </div>
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={loadServiceStatus}
                  disabled={isCheckingHealth}
                >
                  Refresh Status
                </Button>
              </div>
            </Tile>
          )}

          {error && (
            <InlineNotification
              kind="error"
              title="Error"
              subtitle={error}
              onClose={() => setError(null)}
            />
          )}

          {success && (
            <InlineNotification
              kind="success"
              title="Success"
              subtitle={success}
              onClose={() => setSuccess(null)}
            />
          )}

          <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
            <Heading style={{ marginBottom: '1rem' }}>Step 1: Upload File</Heading>
            <FileUploader
              labelTitle="Upload Excel File"
              labelDescription="Max file size is 10MB. Supported formats: .xlsx, .xls"
              buttonLabel="Select file"
              filenameStatus="edit"
              accept={['.xlsx', '.xls']}
              onChange={handleFileChange}
              disabled={isUploading || isProcessing || !serviceStatus?.available}
            />
            <Button
              style={{ marginTop: '1rem' }}
              onClick={handleUpload}
              disabled={!file || isUploading || isProcessing || !serviceStatus?.available}
            >
              {isUploading ? 'Uploading...' : 'Upload File'}
            </Button>
          </div>

          {uploadData && (
            <>
              <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                <Heading style={{ marginBottom: '1rem' }}>Step 2: Add Context (Optional)</Heading>
                <TextArea
                  labelText="Provide context for AI processing"
                  placeholder="e.g., This is for Q4 2024 executive review. Focus on strategic initiatives and measurable outcomes."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={4}
                  disabled={isProcessing}
                />
                <Button
                  style={{ marginTop: '1rem' }}
                  onClick={handleProcess}
                  disabled={isProcessing || !serviceStatus?.available}
                  renderIcon={isProcessing ? undefined : Renew}
                >
                  {isProcessing ? 'Processing with AI...' : 'Process with AI'}
                </Button>
              </div>
              
              {/* Enhanced Progress Display */}
              {isProcessing && (
                <ProcessingProgress
                  progress={estimatedProgress}
                  timeRemaining={estimatedTimeRemaining}
                  statusMessage={statusMessage}
                  questionCount={serverQuestionCount ?? uploadData?.totalQuestions}
                  elapsedTime={elapsedTime}
                />
              )}
            </>
          )}

          {processResult && (
            <>
              {/* Processing Summary */}
              <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                <Heading style={{ marginBottom: '1rem' }}>Processing Summary</Heading>

                <Grid narrow>
                  <Column lg={4} md={2} sm={2}>
                    <Tile style={{ backgroundColor: '#393939', textAlign: 'center', padding: '1rem' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#42be65' }}>
                        {processResult.questions_answered}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>Questions Answered</p>
                    </Tile>
                  </Column>

                  <Column lg={4} md={2} sm={2}>
                    <Tile style={{ backgroundColor: '#393939', textAlign: 'center', padding: '1rem' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff832b' }}>
                        {(uploadData?.totalQuestions ?? processResult.questions_answered) - processResult.questions_answered}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>Left Blank</p>
                    </Tile>
                  </Column>

                  <Column lg={4} md={2} sm={2}>
                    <Tile style={{ backgroundColor: '#393939', textAlign: 'center', padding: '1rem' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#78a9ff' }}>
                        {uploadData?.totalQuestions
                          ? ((processResult.questions_answered / uploadData.totalQuestions) * 100).toFixed(0) + '%'
                          : '100%'}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>Completion Rate</p>
                    </Tile>
                  </Column>

                  <Column lg={4} md={2} sm={2}>
                    <Tile style={{ backgroundColor: '#393939', textAlign: 'center', padding: '1rem' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                        {uploadData?.totalQuestions ?? processResult.questions_answered}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>Total Questions</p>
                    </Tile>
                  </Column>
                </Grid>

                <div style={{ marginTop: '1.5rem' }}>
                  <ProgressBar
                    label="Completion Progress"
                    value={
                      uploadData?.totalQuestions
                        ? (processResult.questions_answered / uploadData.totalQuestions) * 100
                        : 100
                    }
                    max={100}
                  />
                </div>
              </div>

              {/* Q&A Preview */}
              {processResult.qa_pairs && processResult.qa_pairs.length > 0 && (
                <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                  <Heading style={{ marginBottom: '0.5rem' }}>
                    <CheckmarkFilled style={{ marginRight: '0.5rem', color: '#42be65' }} />
                    Step 3: AI-Answered Questions ({processResult.qa_pairs.length})
                  </Heading>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                    <Tag type="green">{processResult.questions_answered} answered</Tag>
                    <Tag type="blue">
                      {processResult.sheets_processed} / {processResult.total_sheets} sheets
                    </Tag>
                    {processResult.details.map((d) => (
                      <Tag key={d.sheet} type="gray">
                        {d.sheet}: {d.questions_answered}
                      </Tag>
                    ))}
                  </div>
                  <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                  <DataTable
                    rows={processResult.qa_pairs.map((pair, i) => ({
                      id: `${i}`,
                      sheet: pair.sheet,
                      question: pair.question.length > 80
                        ? pair.question.substring(0, 80) + '...'
                        : pair.question,
                      answer: pair.answer.length > 120
                        ? pair.answer.substring(0, 120) + '...'
                        : pair.answer,
                    }))}
                    headers={[
                      { key: 'sheet', header: 'Sheet' },
                      { key: 'question', header: 'Question' },
                      { key: 'answer', header: 'AI Answer' },
                    ]}
                  >
                    {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                      <Table {...getTableProps()}>
                        <TableHead>
                          <TableRow>
                            {headers.map((header) => (
                              <TableHeader {...getHeaderProps({ header })} key={header.key}>
                                {header.header}
                              </TableHeader>
                            ))}
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.map((row) => (
                            <TableRow {...getRowProps({ row })} key={row.id}>
                              {row.cells.map((cell) => (
                                <TableCell key={cell.id}>{cell.value}</TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </DataTable>
                  </div>
                </div>
              )}

              {processResult.qa_pairs && processResult.qa_pairs.length === 0 && (
                <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                  <p style={{ color: '#c6c6c6', fontSize: '0.875rem' }}>
                    No unanswered questions were found — all questions already had answers.
                  </p>
                </div>
              )}

              {/* Download */}
              <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                <Heading style={{ marginBottom: '1rem' }}>Step 4: Download</Heading>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Button onClick={handleDownload} renderIcon={Download}>
                    Download Processed File
                  </Button>
                  <Button kind="secondary" onClick={() => navigate('/validate')}>
                    Validate Answers
                  </Button>
                  <Button kind="tertiary" onClick={handleReset}>
                    Process Another File
                  </Button>
                </div>
              </div>
            </>
          )}
        </Stack>
      </Column>
    </Grid>
  );
};

export default ProcessPage;

// Made with Bob
