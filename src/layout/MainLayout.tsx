import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  Header,
  HeaderName,
  HeaderNavigation,
  HeaderMenuItem,
  HeaderGlobalBar,
  HeaderGlobalAction,
  SkipToContent,
  Content,
} from '@carbon/react';
import { UserAvatar } from '@carbon/icons-react';

interface UserInfo {
  email: string;
  name: string;
  authenticated: boolean;
}

const MainLayout: React.FC = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Fetch user information from SSO
    fetch('/api/user')
      .then(res => res.json())
      .then(data => setUserInfo(data))
      .catch(err => console.error('Failed to fetch user info:', err));
  }, []);

  // Extract first name from full name or use email prefix
  const getDisplayName = () => {
    if (!userInfo) return '';
    
    // Try to get first name from full name
    const firstName = userInfo.name.split(' ')[0];
    if (firstName && firstName !== 'Anonymous' && firstName !== 'Development') {
      return firstName;
    }
    
    // Fallback to email prefix
    return userInfo.email.split('@')[0];
  };

  const displayName = getDisplayName();

  return (
    <>
      <Header aria-label="CRAFT">
        <SkipToContent />
        <HeaderName href="/" prefix="IBM">
          CRAFT
        </HeaderName>
        <HeaderNavigation aria-label="Main Navigation">
          <HeaderMenuItem href="/">Home</HeaderMenuItem>
          <HeaderMenuItem href="/process">Process Files</HeaderMenuItem>
          <HeaderMenuItem href="/delta">Delta Tool</HeaderMenuItem>
          <HeaderMenuItem href="/validate">Validate</HeaderMenuItem>
          <HeaderMenuItem href="/team">Team</HeaderMenuItem>
          <HeaderMenuItem href="/feedback">Feedback</HeaderMenuItem>
        </HeaderNavigation>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label={userInfo ? `User Profile: ${displayName}` : 'User Profile'}
            tooltipAlignment="end"
          >
            <UserAvatar size={20} />
            {displayName && (
              <span style={{ marginLeft: '8px', fontSize: '14px' }}>
                {displayName}
              </span>
            )}
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>
      <Content>
        <Outlet />
      </Content>
    </>
  );
};

export default MainLayout;

// Made with Bob
