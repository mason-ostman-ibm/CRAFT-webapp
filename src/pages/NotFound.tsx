import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Grid, Column, Heading, Button } from '@carbon/react';
import { ArrowLeft } from '@carbon/icons-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Grid className="page-content" fullWidth>
      <Column lg={16} md={8} sm={4}>
        <div style={{ 
          marginTop: '5rem', 
          textAlign: 'center',
          padding: '3rem'
        }}>
          <Heading style={{ fontSize: '4rem', marginBottom: '1rem' }}>
            404
          </Heading>
          <Heading style={{ marginBottom: '1rem' }}>
            Page Not Found
          </Heading>
          <p style={{ marginBottom: '2rem', fontSize: '1.125rem' }}>
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Button 
            onClick={() => navigate('/')}
            renderIcon={ArrowLeft}
          >
            Back to Home
          </Button>
        </div>
      </Column>
    </Grid>
  );
};

export default NotFound;

// Made with Bob
