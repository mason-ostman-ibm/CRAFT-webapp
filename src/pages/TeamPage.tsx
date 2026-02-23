import React from 'react';
import {
  Grid,
  Column,
  Heading,
  Stack,
  Tile,
  Tag,
} from '@carbon/react';
import { UserMultiple, Star } from '@carbon/icons-react';

interface TeamMember {
  name: string;
  title: string;
  coop: boolean;
  lead?: boolean;
  projectLead?: boolean;
}

const teamMembers: TeamMember[] = [
  {
    name: 'Jinishia Norwood',
    title: 'Principal Security Architect',
    coop: false,
    projectLead: true,
  },
  {
    name: 'Mason Ostman',
    title: 'AI Engineer',
    coop: true,
    lead: true,
  },
  {
    name: 'Caesar Ugwuanyi',
    title: 'AI Engineer',
    coop: true,
  },
  {
    name: 'Michael Mensah',
    title: 'Customer Success Manager',
    coop: true,
  },
];

const TeamPage: React.FC = () => {
  return (
    <Grid className="page-content" fullWidth>
      <Column lg={16} md={8} sm={4}>
        <Stack gap={7}>
          <div className="cds--spacing-06">
            <div className="cds--type-heading-04" style={{ display: 'flex', alignItems: 'center', gap: 'var(--cds-spacing-05)' }}>
              <UserMultiple size={32} />
              <span>Team</span>
            </div>
            <p className="cds--type-body-01 cds--spacing-05">
              Meet the Experience Engineering team behind CRAFT - the Compliance Review and Analysis Facilitation Tool.
            </p>
          </div>

          <Grid narrow>
            {teamMembers.map((member) => (
              <Column key={member.name} lg={4} md={4} sm={4} className="cds--spacing-05">
                <Tile
                  className="cds--tile--clickable"
                  style={{
                    height: '100%',
                    borderLeft: member.lead || member.projectLead ? '3px solid var(--cds-border-interactive)' : undefined,
                  }}
                >
                  <Stack gap={3}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--cds-spacing-03)', flexWrap: 'wrap' }}>
                      <UserMultiple size={20} />
                      {member.projectLead && (
                        <Tag type="cyan" size="sm">
                          <Star size={12} style={{ marginRight: 'var(--cds-spacing-02)' }} />
                          Project Lead
                        </Tag>
                      )}
                      {member.lead && (
                        <Tag type="cyan" size="sm">
                          <Star size={12} style={{ marginRight: 'var(--cds-spacing-02)' }} />
                          Tech Lead
                        </Tag>
                      )}
                      {member.coop && <Tag type="blue" size="sm">Co-op</Tag>}
                    </div>
                    <Heading className="cds--type-heading-03">{member.name}</Heading>
                    <p className="cds--type-body-01 cds--text-secondary">{member.title}</p>
                  </Stack>
                </Tile>
              </Column>
            ))}
          </Grid>
        </Stack>
      </Column>
    </Grid>
  );
};

export default TeamPage;
