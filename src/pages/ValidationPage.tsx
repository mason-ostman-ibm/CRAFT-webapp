import React, { useState } from 'react';
import {
  Grid,
  Column,
  Heading,
  Button,
  DataTable,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Tag,
  InlineNotification,
  Stack,
  ProgressBar,
} from '@carbon/react';
import { CheckmarkFilled, WarningFilled } from '@carbon/icons-react';

interface ValidationResult {
  question: string;
  answer: string;
  isValid: boolean;
  isEmpty: boolean;
  wordCount: number;
}

interface ValidationSummary {
  total: number;
  valid: number;
  invalid: number;
  completionRate: string;
}

const ValidationPage: React.FC = () => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const headers = [
    { key: 'question', header: 'Question' },
    { key: 'answer', header: 'Answer' },
    { key: 'wordCount', header: 'Word Count' },
    { key: 'status', header: 'Status' },
  ];

  const rows = validationResults.map((result, index) => ({
    id: `${index}`,
    question: result.question,
    answer: result.answer || 'Empty',
    wordCount: result.wordCount,
    status: result.isValid ? 'Valid' : 'Invalid',
  }));

  const handleValidate = async () => {
    // This would typically get data from the process page or API
    // For now, showing placeholder functionality
    setError('Please process a file first on the Process page');
  };

  return (
    <Grid className="page-content" fullWidth>
      <Column lg={16} md={8} sm={4}>
        <Stack gap={7}>
          <div style={{ marginTop: '3rem' }}>
            <Heading className="page-title">Validate Answers</Heading>
            <p className="page-description" style={{ marginTop: '1rem' }}>
              Review and validate AI-generated answers before finalizing your Excel file.
            </p>
          </div>

          {error && (
            <InlineNotification
              kind="info"
              title="Information"
              subtitle={error}
              onClose={() => setError(null)}
            />
          )}

          {summary && (
            <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
              <Heading style={{ marginBottom: '1rem' }}>Validation Summary</Heading>
              <Grid narrow>
                <Column lg={4} md={2} sm={4}>
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Heading style={{ fontSize: '2rem', color: '#42be65' }}>
                      {summary.valid}
                    </Heading>
                    <p>Valid Answers</p>
                  </div>
                </Column>
                <Column lg={4} md={2} sm={4}>
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Heading style={{ fontSize: '2rem', color: '#ff832b' }}>
                      {summary.invalid}
                    </Heading>
                    <p>Invalid Answers</p>
                  </div>
                </Column>
                <Column lg={4} md={2} sm={4}>
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Heading style={{ fontSize: '2rem' }}>
                      {summary.total}
                    </Heading>
                    <p>Total Questions</p>
                  </div>
                </Column>
                <Column lg={4} md={2} sm={4}>
                  <div style={{ textAlign: 'center', padding: '1rem' }}>
                    <Heading style={{ fontSize: '2rem', color: '#78a9ff' }}>
                      {summary.completionRate}
                    </Heading>
                    <p>Completion Rate</p>
                  </div>
                </Column>
              </Grid>
              <ProgressBar
                label="Completion Progress"
                value={parseInt(summary.completionRate)}
                max={100}
                style={{ marginTop: '1rem' }}
              />
            </div>
          )}

          {validationResults.length > 0 ? (
            <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px' }}>
              <Heading style={{ marginBottom: '1rem' }}>Validation Results</Heading>
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
                      {rows.map((row, index) => (
                        <TableRow {...getRowProps({ row })}>
                          {row.cells.map((cell) => (
                            <TableCell key={cell.id}>
                              {cell.info.header === 'status' ? (
                                <Tag
                                  type={validationResults[index].isValid ? 'green' : 'red'}
                                  renderIcon={
                                    validationResults[index].isValid
                                      ? CheckmarkFilled
                                      : WarningFilled
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
          ) : (
            <div style={{ padding: '2rem', backgroundColor: '#262626', borderRadius: '4px', textAlign: 'center' }}>
              <Heading style={{ marginBottom: '1rem' }}>No Data to Validate</Heading>
              <p style={{ marginBottom: '1.5rem' }}>
                Process a file first to see validation results here.
              </p>
              <Button onClick={handleValidate}>
                Load Validation Data
              </Button>
            </div>
          )}
        </Stack>
      </Column>
    </Grid>
  );
};

export default ValidationPage;

// Made with Bob
