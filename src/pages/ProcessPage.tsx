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
} from '@carbon/react';
import { Download, Renew } from '@carbon/icons-react';

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

const ProcessPage: React.FC = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [context, setContext] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
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
        setQuestions(data.questions);
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

    try {
      // Use Python RAG service for enhanced processing
      const formData = new FormData();
      formData.append('file', file);
      formData.append('context', context);

      const response = await fetch('http://localhost:5000/process', {
        method: 'POST',
        body: formData,
      });

      // Check if response is a file (direct download) or JSON (error or metadata)
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
        // It's an Excel file - download it
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name.replace('.xlsx', '_completed.xlsx');
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setSuccess('RAG Processing completed! File downloaded successfully.');
      } else {
        // It's JSON - likely an error
        const data = await response.json();
        if (data.error) {
          setError(data.error || 'Failed to process with AI');
          if (data.details) {
            console.error('Processing details:', data.details);
          }
        } else {
          setError('Unexpected response format from server');
        }
      }
    } catch (err) {
      setError('Network error. Make sure Python service is running on port 5000.');
      console.error('Process error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async (processedQuestions: Question[]) => {
    if (!uploadData) return;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalFilePath: uploadData.filePath,
          questions: processedQuestions,
          answers: processedQuestions.map(q => ({ answer: q.answer })),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setDownloadUrl(data.downloadUrl);
        setSuccess('File generated successfully! Click download to get your file.');
      } else {
        setError(data.error || 'Failed to generate file');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Generate error:', err);
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
    setQuestions([]);
    setContext('');
    setError(null);
    setSuccess(null);
    setDownloadUrl(null);
  };

  const headers = [
    { key: 'question', header: 'Question' },
    { key: 'answer', header: 'Answer' },
  ];

  const rows = questions.map((q, index) => ({
    id: `${index}`,
    question: q.question,
    answer: q.answer || 'Not yet processed',
  }));

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
              </div>

              <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                <Heading style={{ marginBottom: '1rem' }}>Questions & Answers</Heading>
                {isProcessing && <Loading description="Processing with AI..." />}
                <DataTable rows={rows} headers={headers}>
                  {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
                    <Table {...getTableProps()}>
                      <TableHead>
                        <TableRow>
                          {headers.map((header) => (
                            <TableHeader {...getHeaderProps({ header })}>
                              {header.header}
                            </TableHeader>
                          ))}
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow {...getRowProps({ row })}>
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

              {downloadUrl && (
                <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
                  <Heading style={{ marginBottom: '1rem' }}>Step 3: Download</Heading>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button
                      onClick={handleDownload}
                      renderIcon={Download}
                    >
                      Download Processed File
                    </Button>
                    <Button
                      kind="secondary"
                      onClick={() => navigate('/validate')}
                    >
                      Validate Answers
                    </Button>
                    <Button
                      kind="tertiary"
                      onClick={handleReset}
                    >
                      Process Another File
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Stack>
      </Column>
    </Grid>
  );
};

export default ProcessPage;

// Made with Bob
