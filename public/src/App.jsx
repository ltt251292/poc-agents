import React from 'react';
import Sidebar from './components/Sidebar';
import ChatMessages from './components/ChatMessages';
import ChatInput from './components/ChatInput';
import AttachmentsPanel from './components/AttachmentsPanel';
import ArtifactsPanel from './components/ArtifactsPanel';
import { ChatProvider, useChat } from './hooks/useChat';
import ConversationsSidebar from './components/ConversationsSidebar';

/**
 * Main App component
 * Quản lý layout chính của ứng dụng chat AI Agent
 */
function AppContent() {
  const { artifacts, attachments } = useChat();
  const hasArtifacts = artifacts && artifacts.length > 0;
  // Check if attachments has organic results
  const payload = attachments?.data?.data || attachments?.data;
  const organic = payload?.result?.organic || payload?.organic || [];
  const hasAttachments = Array.isArray(organic) && organic.length > 0;

  return (
    <div className="app-wrapper">
      <Sidebar />
      <div className={`container ${hasArtifacts ? '' : 'artifacts-hidden'} ${hasAttachments ? '' : 'attachments-hidden'}`}>
        <ConversationsSidebar />
        <div className="main-content">
          <ChatMessages />
          <ChatInput />
        </div>
        <div className="artifacts-panel-wrapper">
          <ArtifactsPanel />
        </div>
        <div className="attachments-panel-wrapper">
          <AttachmentsPanel />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}

export default App;

