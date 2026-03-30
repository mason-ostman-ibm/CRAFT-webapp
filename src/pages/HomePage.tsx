import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Column,
  Heading,
  Button,
  Tile,
  Stack,
} from '@carbon/react';
import { Upload, DocumentTasks, CheckmarkOutline } from '@carbon/icons-react';
import DisclaimerNotice from '../components/DisclaimerNotice';

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Grid className="page-content" fullWidth>
      <Column lg={16} md={8} sm={4}>
        <Stack gap={7}>
          <div style={{ marginTop: '3rem' }}>
            <Heading className="page-title">
              Excel AI Processor for Leaders
            </Heading>
            <p className="page-description" style={{ marginTop: '1rem', fontSize: '1.125rem' }}>
              Streamline your Excel questionnaire workflow with AI-powered automation.
              Upload, process, and validate your files with IBM WatsonX.ai.
            </p>
          </div>

          <DisclaimerNotice />

          <Grid narrow>
            <Column lg={5} md={4} sm={4}>
              <Tile className="feature-tile" style={{ height: '100%', padding: '2rem' }}>
                <Upload size={32} style={{ marginBottom: '1rem' }} />
                <Heading style={{ marginBottom: '1rem' }}>Upload Files</Heading>
                <p style={{ marginBottom: '1.5rem' }}>
                  Upload your Excel files containing questions and answers.
                  Supports .xlsx and .xls formats up to 10MB.
                </p>
                <Button onClick={() => navigate('/process')}>
                  Get Started
                </Button>
              </Tile>
            </Column>

            <Column lg={5} md={4} sm={4}>
              <Tile className="feature-tile" style={{ height: '100%', padding: '2rem' }}>
                <DocumentTasks size={32} style={{ marginBottom: '1rem' }} />
                <Heading style={{ marginBottom: '1rem' }}>AI Processing</Heading>
                <p style={{ marginBottom: '1.5rem' }}>
                  Leverage IBM WatsonX.ai to automatically generate professional
                  answers for your questionnaires.
                </p>
                <Button kind="secondary" onClick={() => navigate('/process')}>
                  Process Files
                </Button>
              </Tile>
            </Column>

            <Column lg={5} md={4} sm={4}>
              <Tile className="feature-tile" style={{ height: '100%', padding: '2rem' }}>
                <CheckmarkOutline size={32} style={{ marginBottom: '1rem' }} />
                <Heading style={{ marginBottom: '1rem' }}>Validate</Heading>
                <p style={{ marginBottom: '1.5rem' }}>
                  Review and validate AI-generated answers before downloading
                  your completed Excel file.
                </p>
                <Button kind="tertiary" onClick={() => navigate('/validate')}>
                  Validate Answers
                </Button>
              </Tile>
            </Column>
          </Grid>

          <Tile style={{ padding: '2rem', marginTop: '2rem' }}>
            <Heading style={{ marginBottom: '1rem' }}>How It Works</Heading>
            <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li><strong>Upload:</strong> Select your Excel file with questions in the first column</li>
              <li><strong>Process:</strong> AI analyzes questions and generates professional answers</li>
              <li><strong>Validate:</strong> Review the generated answers for accuracy</li>
              <li><strong>Download:</strong> Get your completed Excel file with all answers filled in</li>
            </ol>
          </Tile>

          <Tile style={{ padding: '2rem', backgroundColor: '#161616' }}>
            <Heading style={{ marginBottom: '1rem' }}>Built with IBM Technology</Heading>
            <p>
              This application uses <strong>IBM Carbon Design System</strong> for a consistent user experience,
              <strong> IBM WatsonX.ai</strong> for intelligent answer generation, and
              <strong> Instana</strong> for comprehensive monitoring and observability.
            </p>
          </Tile>
        </Stack>
      </Column>
    </Grid>
  );
};

export default HomePage;

// Made with Bob
