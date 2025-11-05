import React, { useEffect, useState } from 'react';
import { useChat } from '../hooks/useChat';

/**
 * ConversationsPanel
 * Danh sách conversationId dạng expandable/accordion
 */
function ConversationsPanel() {
  const { config, conversations, loadConversations } = useChat();
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    // Load khi userId thay đổi
    loadConversations();
  }, [config.userId, loadConversations]);

  const toggle = (id) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  return (
    <div className="conversations-panel">
      <div className="panel-header">
        <div className="panel-title">Conversations</div>
        <button className="btn-refresh" onClick={loadConversations}>Refresh</button>
      </div>
      <div className="panel-subtitle">userId: {config.userId}</div>

      {(!conversations || conversations.length === 0) && (
        <div className="panel-empty">No conversations</div>
      )}

      <div className="accordion">
        {conversations.map((c) => (
          <div key={c.id} className={`accordion-item ${expandedId === c.id ? 'expanded' : ''}`}>
            <button className="accordion-header" onClick={() => toggle(c.id)}>
              <span className="mono">{c.id}</span>
              <span className="muted">{new Date(c.createdAt).toLocaleString()}</span>
            </button>
            {expandedId === c.id && (
              <div className="accordion-body">
                <div><strong>title:</strong> {c.title}</div>
                <div><strong>resourceId:</strong> {c.resourceId}</div>
                <div><strong>createdAt:</strong> {new Date(c.createdAt).toLocaleString()}</div>
                <div><strong>updatedAt:</strong> {new Date(c.updatedAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ConversationsPanel;


