import React, { useState } from 'react';
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
} from '@carbon/react';
import { Download, Renew, CheckmarkFilled } from '@carbon/icons-react';

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

const ProcessPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [context, setContext] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);

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

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', context);

      const response = await fetch('/api/python/process', {
        method: 'POST',
        body: formData,
      });

      const data: ProcessResult = await response.json();

      if (response.ok && data.success) {
        setProcessResult(data);
        setDownloadUrl(data.download_url);
        setSuccess(
          `Processing complete! Answered ${data.questions_answered} questions across ${data.sheets_processed} sheet(s).`
        );
      } else {
        const errData = data as any;
        setError(errData.error || 'Failed to process with AI');
        if (errData.details) {
          console.error('Processing details:', errData.details);
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Process error:', err);
    } finally {
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
              disabled={isUploading || isProcessing}
            />
            <Button
              style={{ marginTop: '1rem' }}
              onClick={handleUpload}
              disabled={!file || isUploading || isProcessing}
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
                  disabled={isProcessing}
                  renderIcon={isProcessing ? undefined : Renew}
                >
                  {isProcessing ? 'Processing with AI...' : 'Process with AI'}
                </Button>
                {isProcessing && (
                  <div style={{ marginTop: '1rem' }}>
                    <Loading description="Processing with AI — this may take a few minutes..." />
                  </div>
                )}
              </div>
            </>
          )}

          {processResult && (
            <>
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
