import React from 'react';
import {
  Grid,
  Column,
  Heading,
  Stack,
  Tile,
} from '@carbon/react';
import { UserMultiple } from '@carbon/icons-react';

const TeamPage: React.FC = () => {
  return (
    <Grid className="page-content" fullWidth>
      <Column lg={16} md={8} sm={4}>
        <Stack gap={7}>
          <div style={{ marginTop: '3rem' }}>
            <Heading className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <UserMultiple size={32} />
              Team
            </Heading>
            <p className="page-description" style={{ marginTop: '1rem' }}>
              Meet the team behind CRAFT - the Compliance Review and Analysis Facilitation Tool.
            </p>
          </div>

          {/* Placeholder for team members */}
          <Tile style={{ padding: '3rem', textAlign: 'center' }}>
            <UserMultiple size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <Heading style={{ marginBottom: '1rem' }}>Team Members</Heading>
            <p style={{ color: '#c6c6c6', maxWidth: '600px', margin: '0 auto' }}>
              Team member profiles will be added here. This section will showcase the talented individuals
              who contribute to making CRAFT a powerful tool for governance and compliance.
            </p>
          </Tile>
        </Stack>
      </Column>
    </Grid>
  );
};

export default TeamPage;

// Made with Bob