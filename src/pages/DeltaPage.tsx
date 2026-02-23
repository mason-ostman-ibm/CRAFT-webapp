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
  TextInput,
  Stack,
  ProgressBar,
  Tile,
  Tag,
  Toggle,
} from '@carbon/react';
import { Download, Upload, Renew, CheckmarkFilled, WarningFilled } from '@carbon/icons-react';

interface BaselineInfo {
  exists: boolean;
  collection_name?: string;
  description?: string;
  user_email?: string;
  ingested_at?: string;
  empty?: boolean;
}

interface Match {
  current_question: string;
  current_sheet: string;
  current_row: number;
  matched_question: string;
  similarity_score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  answer_reused: string;
  baseline_sheet: string;
  baseline_row: number;
  llm_verified: boolean;
}

interface Unmatched {
  question: string;
  sheet: string;
  row: number;
  reason: string;
  best_similarity?: number;
  best_match?: string;
}

interface ProcessingSummary {
  total_questions: number;
  auto_answered: number;
  left_blank: number;
  high_confidence: number;
  medium_confidence: number;
  low_confidence: number;
  completion_rate: string;
}

interface DeltaStatus {
  available: boolean;
  service: string;
  astradb_configured: boolean;
  llm_verification_enabled: boolean;
  similarity_threshold: number;
}

const DeltaPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [deltaStatus, setDeltaStatus] = useState<DeltaStatus | null>(null);
  const [baselineInfo, setBaselineInfo] = useState<BaselineInfo | null>(null);
  const [baselineFile, setBaselineFile] = useState<File | null>(null);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [useLlmMode, setUseLlmMode] = useState(false);
  const [isUploadingBaseline, setIsUploadingBaseline] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [processingResults, setProcessingResults] = useState<{
    summary: ProcessingSummary;
    matches: Match[];
    unmatched: Unmatched[];
    download_url: string;
  } | null>(null);

  // Load delta status and baseline info on mount
  useEffect(() => {
    loadDeltaStatus();
    loadBaselineInfo();
  }, []);

  // Clean up polling interval on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const loadDeltaStatus = async () => {
    try {
      const response = await fetch('/api/delta/status');
      const data = await response.json();
      setDeltaStatus(data);

      if (!data.available) {
        setError('Delta Service is not available. Please configure AstraDB credentials.');
      }
    } catch (err) {
      console.error('Error loading delta status:', err);
      setError('Failed to check Delta Service status');
    }
  };

  const loadBaselineInfo = async () => {
    try {
      const response = await fetch('/api/delta/baseline-info');
      const data = await response.json();

      if (data.available && data.baseline) {
        setBaselineInfo(data.baseline);
      }
    } catch (err) {
      console.error('Error loading baseline info:', err);
    }
  };

  const handleBaselineFileChange = (event: any) => {
    const files = event.target?.files || event.addedFiles;
    if (files && files.length > 0) {
      setBaselineFile(files[0]);
      setError(null);
    }
  };

  const handleCurrentFileChange = (event: any) => {
    const files = event.target?.files || event.addedFiles;
    if (files && files.length > 0) {
      setCurrentFile(files[0]);
      setError(null);
    }
  };

  const handleUploadBaseline = async () => {
    if (!baselineFile) {
      setError('Please select a file');
      return;
    }

    setIsUploadingBaseline(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', baselineFile);
    formData.append('description', description);

    try {
      const response = await fetch('/api/delta/upload-baseline', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccess(`Baseline uploaded successfully! Ingested ${data.questions_ingested} Q&A pairs.`);
        setBaselineFile(null);
        setDescription('');

        // Reload baseline info
        await loadBaselineInfo();
      } else {
        setError(data.error || data.message || 'Failed to upload baseline');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Upload baseline error:', err);
    } finally {
      setIsUploadingBaseline(false);
    }
  };

  const handleProcessDelta = async () => {
    if (!currentFile) {
      setError('Please select a file');
      return;
    }

    if (!baselineInfo || !baselineInfo.exists) {
      setError('Please upload a baseline first');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setProcessingResults(null);
    setStatusMessage('Submitting job...');

    const formData = new FormData();
    formData.append('file', currentFile);
    formData.append('use_llm', useLlmMode.toString());

    try {
      const response = await fetch('/api/delta/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || data.message || 'Failed to submit job');
        setIsProcessing(false);
        return;
      }

      const jobId: string = data.job_id;
      setStatusMessage('Job queued. Processing will start shortly...');

      // Poll every 3 seconds until completed or failed
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/delta/job/${jobId}/status`);
          const statusData = await statusRes.json();

          if (statusData.message) {
            setStatusMessage(statusData.message);
          }

          if (statusData.status === 'completed') {
            clearInterval(pollingRef.current!);
            pollingRef.current = null;

            const result = statusData.result;
            setProcessingResults({
              summary: result.processing_summary,
              matches: result.matches,
              unmatched: result.unmatched,
              download_url: `/api/delta/job/${jobId}/download`,
            });
            setSuccess(
              `Processing complete! Auto-answered ${result.processing_summary.auto_answered} of ${result.processing_summary.total_questions} questions (${result.processing_summary.completion_rate}).`
            );
            setIsProcessing(false);
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
      console.error('Process delta error:', err);
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (processingResults?.download_url) {
      window.location.href = processingResults.download_url;
    }
  };

  const handleReset = () => {
    setCurrentFile(null);
    setProcessingResults(null);
    setError(null);
    setSuccess(null);
  };

  // Table headers for matches
  const matchHeaders = [
    { key: 'current_question', header: 'Current Question' },
    { key: 'confidence', header: 'Confidence' },
    { key: 'similarity', header: 'Similarity' },
    { key: 'matched_question', header: 'Matched Question' },
  ];

  const matchRows = processingResults?.matches.map((match, index) => ({
    id: `${index}`,
    current_question: match.current_question.substring(0, 80) + (match.current_question.length > 80 ? '...' : ''),
    confidence: match.confidence,
    similarity: (match.similarity_score * 100).toFixed(1) + '%',
    matched_question: match.matched_question.substring(0, 80) + (match.matched_question.length > 80 ? '...' : ''),
  })) || [];

  // Table headers for unmatched
  const unmatchedHeaders = [
    { key: 'question', header: 'Question' },
    { key: 'reason', header: 'Reason' },
    { key: 'best_similarity', header: 'Best Match Score' },
  ];

  const unmatchedRows = processingResults?.unmatched.map((item, index) => ({
    id: `${index}`,
    question: item.question.substring(0, 100) + (item.question.length > 100 ? '...' : ''),
    reason: item.reason,
    best_similarity: item.best_similarity ? (item.best_similarity * 100).toFixed(1) + '%' : 'N/A',
  })) || [];

  return (
    <Grid className="page-content" fullWidth>
      <Column lg={16} md={8} sm={4}>
        <Stack gap={7}>
          <div style={{ marginTop: '3rem' }}>
            <Heading className="page-title">Questionnaire Delta Tool</Heading>
            <p className="page-description" style={{ marginTop: '1rem' }}>
              Intelligently reuse answers from previous year questionnaires using AI-powered semantic matching.
            </p>
          </div>

          {/* Service Status */}
          {deltaStatus && (
            <Tile style={{ backgroundColor: '#262626' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Heading style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Service Status</Heading>
                  <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>
                    {deltaStatus.available ? (
                      <span style={{ color: '#42be65' }}>✓ Delta Service is available</span>
                    ) : (
                      <span style={{ color: '#ff832b' }}>⚠ Delta Service is not configured</span>
                    )}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.75rem', color: '#8d8d8d' }}>
                    Similarity Threshold: {(deltaStatus.similarity_threshold * 100).toFixed(0)}%
                  </p>
                  <p style={{ fontSize: '0.75rem', color: '#8d8d8d' }}>
                    LLM Verification: {deltaStatus.llm_verification_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
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

          {/* Step 1: Upload Baseline */}
          <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
            <Heading style={{ marginBottom: '1rem' }}>Step 1: Upload Baseline Questionnaire</Heading>
            <p style={{ marginBottom: '1rem', color: '#c6c6c6', fontSize: '0.875rem' }}>
              Upload a completed questionnaire to use as the baseline for answer reuse. This will replace any existing baseline.
            </p>

            <Stack gap={5}>
              <TextInput
                id="baseline-description"
                labelText="Description (Optional)"
                placeholder="e.g., 2024 Security Questionnaire"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isUploadingBaseline}
              />

              <FileUploader
                labelTitle="Upload baseline file"
                labelDescription="Max file size is 10MB. Only .xlsx files are supported."
                buttonLabel="Select file"
                filenameStatus="edit"
                accept={['.xlsx']}
                onChange={handleBaselineFileChange}
                disabled={isUploadingBaseline || !deltaStatus?.available}
              />

              <Button
                onClick={handleUploadBaseline}
                disabled={!baselineFile || isUploadingBaseline || !deltaStatus?.available}
                renderIcon={Upload}
              >
                {isUploadingBaseline ? 'Uploading...' : 'Upload Baseline'}
              </Button>
            </Stack>
          </div>

          {/* Current Baseline Info */}
          {baselineInfo && baselineInfo.exists && !baselineInfo.empty && (
            <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
              <Heading style={{ marginBottom: '1rem' }}>Current Baseline</Heading>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {baselineInfo.description && (
                  <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>
                    <strong>Description:</strong> {baselineInfo.description}
                  </p>
                )}
                {baselineInfo.ingested_at && (
                  <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>
                    <strong>Uploaded:</strong> {new Date(baselineInfo.ingested_at).toLocaleString()}
                  </p>
                )}
                <Tag type="green">Baseline Ready</Tag>
              </div>
            </div>
          )}

          {/* Step 2: Process Current Year */}
          {baselineInfo && baselineInfo.exists && !baselineInfo.empty && (
            <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
              <Heading style={{ marginBottom: '1rem' }}>Step 2: Process Current Questionnaire</Heading>
              <p style={{ marginBottom: '1rem', color: '#c6c6c6', fontSize: '0.875rem' }}>
                Upload the current questionnaire to automatically fill answers using the baseline.
              </p>

              <Stack gap={5}>
                <Toggle
                  id="llm-mode-toggle"
                  labelText="Answer Generation Mode"
                  labelA="Copy/Paste"
                  labelB="LLM Generation"
                  toggled={useLlmMode}
                  onToggle={(checked) => setUseLlmMode(checked)}
                  disabled={isProcessing}
                />
                <p style={{ fontSize: '0.75rem', color: '#8d8d8d', marginTop: '-1rem' }}>
                  {useLlmMode
                    ? ' LLM will generate contextual answers using baseline as reference (slower, more adaptive)'
                    : ' Direct copy/paste of matching answers from baseline (faster, exact matches)'}
                </p>

                <FileUploader
                  labelTitle="Upload current file"
                  labelDescription="Max file size is 10MB. Only .xlsx files are supported."
                  buttonLabel="Select file"
                  filenameStatus="edit"
                  accept={['.xlsx']}
                  onChange={handleCurrentFileChange}
                  disabled={isProcessing}
                />

                <Button
                  onClick={handleProcessDelta}
                  disabled={!currentFile || isProcessing}
                  renderIcon={isProcessing ? undefined : Renew}
                >
                  {isProcessing ? 'Processing...' : 'Process Delta'}
                </Button>
              </Stack>
              
              {isProcessing && (
                <div style={{ marginTop: '1rem' }}>
                  <Loading description={statusMessage || 'Processing questionnaire delta...'} />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Results */}
          {processingResults && (
            <>
              <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                <Heading style={{ marginBottom: '1rem' }}>Processing Summary</Heading>
                
                <Grid narrow>
                  <Column lg={4} md={2} sm={2}>
                    <Tile style={{ backgroundColor: '#393939', textAlign: 'center', padding: '1rem' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#42be65' }}>
                        {processingResults.summary.auto_answered}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>Auto-Answered</p>
                    </Tile>
                  </Column>
                  
                  <Column lg={4} md={2} sm={2}>
                    <Tile style={{ backgroundColor: '#393939', textAlign: 'center', padding: '1rem' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff832b' }}>
                        {processingResults.summary.left_blank}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>Left Blank</p>
                    </Tile>
                  </Column>
                  
                  <Column lg={4} md={2} sm={2}>
                    <Tile style={{ backgroundColor: '#393939', textAlign: 'center', padding: '1rem' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold', color: '#78a9ff' }}>
                        {processingResults.summary.completion_rate}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>Completion Rate</p>
                    </Tile>
                  </Column>
                  
                  <Column lg={4} md={2} sm={2}>
                    <Tile style={{ backgroundColor: '#393939', textAlign: 'center', padding: '1rem' }}>
                      <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                        {processingResults.summary.total_questions}
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#c6c6c6' }}>Total Questions</p>
                    </Tile>
                  </Column>
                </Grid>
                
                <div style={{ marginTop: '1.5rem' }}>
                  <ProgressBar
                    label="Completion Progress"
                    value={(processingResults.summary.auto_answered / processingResults.summary.total_questions) * 100}
                    max={100}
                  />
                </div>
              </div>

              {/* Matched Questions */}
              {processingResults.matches.length > 0 && (
                <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                  <Heading style={{ marginBottom: '1rem' }}>
                    <CheckmarkFilled style={{ marginRight: '0.5rem', color: '#42be65' }} />
                    Auto-Answered Questions ({processingResults.matches.length})
                  </Heading>
                  <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                  <DataTable rows={matchRows} headers={matchHeaders}>
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
                                <TableCell key={cell.id}>
                                  {cell.id.includes('confidence') ? (
                                    <Tag
                                      type={
                                        cell.value === 'HIGH' ? 'green' :
                                        cell.value === 'MEDIUM' ? 'blue' : 'gray'
                                      }
                                    >
                                      {cell.value}
                                    </Tag>
                                  ) : (
                                    cell.value
                                  )}
                                </TableCell>
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

              {/* Unmatched Questions */}
              {processingResults.unmatched.length > 0 && (
                <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                  <Heading style={{ marginBottom: '1rem' }}>
                    <WarningFilled style={{ marginRight: '0.5rem', color: '#ff832b' }} />
                    Questions Requiring Attention ({processingResults.unmatched.length})
                  </Heading>
                  <p style={{ marginBottom: '1rem', color: '#c6c6c6', fontSize: '0.875rem' }}>
                    These questions could not be matched with sufficient confidence and require manual completion or AI processing.
                  </p>
                  <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
                  <DataTable rows={unmatchedRows} headers={unmatchedHeaders}>
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

              {/* Download Section */}
              <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                <Heading style={{ marginBottom: '1rem' }}>Step 3: Download & Next Steps</Heading>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <Button
                    onClick={handleDownload}
                    renderIcon={Download}
                  >
                    Download Processed File
                  </Button>
                  
                  {processingResults.summary.left_blank > 0 && (
                    <Button
                      kind="secondary"
                      onClick={() => navigate('/process')}
                    >
                      Complete Remaining with AI
                    </Button>
                  )}
                  
                  <Button
                    kind="tertiary"
                    onClick={handleReset}
                  >
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

export default DeltaPage;

// Made with Bob