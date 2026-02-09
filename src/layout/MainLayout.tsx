import React from 'react';
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
import { UserAvatar, Settings } from '@carbon/icons-react';

const MainLayout: React.FC = () => {
  return (
    <>
      <Header aria-label="Excel AI Processor">
        <SkipToContent />
        <HeaderName href="/" prefix="IBM">
          Excel AI Processor
        </HeaderName>
        <HeaderNavigation aria-label="Main Navigation">
          <HeaderMenuItem href="/">Home</HeaderMenuItem>
          <HeaderMenuItem href="/process">Process Files</HeaderMenuItem>
          <HeaderMenuItem href="/delta">Delta Tool</HeaderMenuItem>
          <HeaderMenuItem href="/validate">Validate</HeaderMenuItem>
          <HeaderMenuItem href="/settings">Settings</HeaderMenuItem>
        </HeaderNavigation>
        <HeaderGlobalBar>
          <HeaderGlobalAction aria-label="Settings" onClick={() => window.location.href = '/settings'}>
            <Settings size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction aria-label="User Profile">
            <UserAvatar size={20} />
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
