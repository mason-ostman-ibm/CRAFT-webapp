import React, { useState } from 'react';
import {
  Grid,
  Column,
  Heading,
  Button,
  TextInput,
  InlineNotification,
  Stack,
  Tile,
  Form,
  FormGroup,
} from '@carbon/react';
import { Save, Locked } from '@carbon/icons-react';

const SettingsPage: React.FC = () => {
  const [watsonxApiKey, setWatsonxApiKey] = useState('');
  const [watsonxProjectId, setWatsonxProjectId] = useState('');
  const [astraDbEndpoint, setAstraDbEndpoint] = useState('');
  const [astraDbToken, setAstraDbToken] = useState('');
  const [orchestrateApiKey, setOrchestrateApiKey] = useState('');
  const [orchestrateUrl, setOrchestrateUrl] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSaveWatsonX = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings/watsonx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: watsonxApiKey,
          projectId: watsonxProjectId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('WatsonX.ai credentials saved successfully!');
        setWatsonxApiKey('');
        setWatsonxProjectId('');
      } else {
        setError(data.error || 'Failed to save credentials');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAstraDB = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings/astradb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: astraDbEndpoint,
          token: astraDbToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('AstraDB credentials saved successfully!');
        setAstraDbEndpoint('');
        setAstraDbToken('');
      } else {
        setError(data.error || 'Failed to save credentials');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveOrchestrate = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/settings/orchestrate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: orchestrateApiKey,
          url: orchestrateUrl,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Watson Orchestrate credentials saved successfully!');
        setOrchestrateApiKey('');
        setOrchestrateUrl('');
      } else {
        setError(data.error || 'Failed to save credentials');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Grid className="page-content" fullWidth>
      <Column lg={16} md={8} sm={4}>
        <Stack gap={7}>
          <div style={{ marginTop: '3rem' }}>
            <Heading className="page-title">Settings - BYOK (Bring Your Own Key)</Heading>
            <p className="page-description" style={{ marginTop: '1rem' }}>
              Configure your own API keys for enhanced privacy and control. Your keys are encrypted and stored securely.
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

          {/* WatsonX.ai Configuration */}
          <Tile style={{ padding: '2rem' }}>
            <Stack gap={5}>
              <div>
                <Heading style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Locked size={24} />
                  IBM WatsonX.ai Credentials
                </Heading>
                <p style={{ color: '#c6c6c6' }}>
                  Required for AI-powered answer generation. Get your credentials from IBM Cloud.
                </p>
              </div>

              <Form>
                <FormGroup legendText="">
                  <TextInput
                    id="watsonx-api-key"
                    labelText="WatsonX API Key"
                    placeholder="Enter your IBM Cloud API key"
                    type="password"
                    value={watsonxApiKey}
                    onChange={(e) => setWatsonxApiKey(e.target.value)}
                  />
                  <TextInput
                    id="watsonx-project-id"
                    labelText="WatsonX Project ID"
                    placeholder="Enter your WatsonX project ID"
                    value={watsonxProjectId}
                    onChange={(e) => setWatsonxProjectId(e.target.value)}
                    style={{ marginTop: '1rem' }}
                  />
                </FormGroup>
              </Form>

              <Button
                onClick={handleSaveWatsonX}
                disabled={!watsonxApiKey || !watsonxProjectId || isSaving}
                renderIcon={Save}
              >
                {isSaving ? 'Saving...' : 'Save WatsonX Credentials'}
              </Button>
            </Stack>
          </Tile>

          {/* AstraDB Configuration */}
          <Tile style={{ padding: '2rem' }}>
            <Stack gap={5}>
              <div>
                <Heading style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Locked size={24} />
                  AstraDB Credentials (Optional)
                </Heading>
                <p style={{ color: '#c6c6c6' }}>
                  Enable RAG (Retrieval-Augmented Generation) for better answers. Create a free account at astra.datastax.com.
                </p>
              </div>

              <Form>
                <FormGroup legendText="">
                  <TextInput
                    id="astradb-endpoint"
                    labelText="AstraDB API Endpoint"
                    placeholder="https://your-db-id.apps.astra.datastax.com"
                    value={astraDbEndpoint}
                    onChange={(e) => setAstraDbEndpoint(e.target.value)}
                  />
                  <TextInput
                    id="astradb-token"
                    labelText="AstraDB Application Token"
                    placeholder="Enter your AstraDB token"
                    type="password"
                    value={astraDbToken}
                    onChange={(e) => setAstraDbToken(e.target.value)}
                    style={{ marginTop: '1rem' }}
                  />
                </FormGroup>
              </Form>

              <Button
                kind="secondary"
                onClick={handleSaveAstraDB}
                disabled={!astraDbEndpoint || !astraDbToken || isSaving}
                renderIcon={Save}
              >
                {isSaving ? 'Saving...' : 'Save AstraDB Credentials'}
              </Button>
            </Stack>
          </Tile>

          {/* Watson Orchestrate Configuration */}
          <Tile style={{ padding: '2rem' }}>
            <Stack gap={5}>
              <div>
                <Heading style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Locked size={24} />
                  Watson Orchestrate Credentials (Optional)
                </Heading>
                <p style={{ color: '#c6c6c6' }}>
                  Enable the AI chatbot assistant. Get your credentials from Watson Orchestrate Settings.
                </p>
              </div>

              <Form>
                <FormGroup legendText="">
                  <TextInput
                    id="orchestrate-api-key"
                    labelText="Orchestrate API Key"
                    placeholder="Enter your Watson Orchestrate API key"
                    type="password"
                    value={orchestrateApiKey}
                    onChange={(e) => setOrchestrateApiKey(e.target.value)}
                  />
                  <TextInput
                    id="orchestrate-url"
                    labelText="Orchestrate URL"
                    placeholder="https://api.us-south.watson-orchestrate.cloud.ibm.com/..."
                    value={orchestrateUrl}
                    onChange={(e) => setOrchestrateUrl(e.target.value)}
                    style={{ marginTop: '1rem' }}
                  />
                </FormGroup>
              </Form>

              <Button
                kind="tertiary"
                onClick={handleSaveOrchestrate}
                disabled={!orchestrateApiKey || !orchestrateUrl || isSaving}
                renderIcon={Save}
              >
                {isSaving ? 'Saving...' : 'Save Orchestrate Credentials'}
              </Button>
            </Stack>
          </Tile>

          {/* Security Notice */}
          <Tile style={{ padding: '2rem', backgroundColor: '#161616' }}>
            <Heading style={{ marginBottom: '1rem' }}>🔒 Security & Privacy</Heading>
            <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li>All API keys are encrypted before storage</li>
              <li>Keys are only accessible by your account</li>
              <li>Keys are never logged or exposed in responses</li>
              <li>You can delete your keys at any time</li>
              <li>BYOK gives you full control over your data</li>
            </ul>
          </Tile>
        </Stack>
      </Column>
    </Grid>
  );
};

export default SettingsPage;

// Made with Bob
