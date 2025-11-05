import React, { useEffect, useState } from 'react';
import { useChat } from '../hooks/useChat';

/**
 * ConversationsSidebar
 * Sidebar bên trái hiển thị danh sách conversation (title)
 * Có dropdown hiển thị usage khi click vào conversation
 */
function ConversationsSidebar() {
  const { config, conversations, loadConversations, loadUsage } = useChat();
  const [expandedConversationId, setExpandedConversationId] = useState(null);
  const [usageData, setUsageData] = useState(null); // Usage data của conversation đang mở
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    // Load conversations khi userId thay đổi
    loadConversations();
  }, [config.userId, loadConversations]);

  /**
   * Load usage khi conversation được mở
   */
  useEffect(() => {
    if (expandedConversationId) {
      setLoadingUsage(true);
      setUsageData(null);
      
      loadUsage(expandedConversationId)
        .then((usage) => {
          setUsageData(usage);
          setLoadingUsage(false);
        })
        .catch((error) => {
          console.error('Error loading usage:', error);
          setUsageData({ data: [], totals: {}, count: 0 });
          setLoadingUsage(false);
        });
    } else {
      // Reset khi đóng dropdown
      setUsageData(null);
      setLoadingUsage(false);
    }
  }, [expandedConversationId, loadUsage]);

  /**
   * Toggle conversation dropdown
   */
  const toggleConversation = (conversationId) => {
    if (expandedConversationId === conversationId) {
      // Đóng dropdown
      setExpandedConversationId(null);
    } else {
      // Mở dropdown - useEffect sẽ tự động load usage
      setExpandedConversationId(conversationId);
    }
  };

  /**
   * Format số để hiển thị
   */
  const formatNumber = (num) => {
    return typeof num === 'number' ? num.toLocaleString() : '0';
  };

  /**
   * Format date để hiển thị
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <aside className="left-sidebar">
      <div className="left-sidebar-header">
        <div className="left-sidebar-title">Conversations</div>
        <button className="btn-refresh" onClick={loadConversations}>Refresh</button>
      </div>

      <div className="conv-list">
        {(conversations || []).map(c => {
          const isExpanded = expandedConversationId === c.id;
          
          return (
            <div key={c.id} className="conv-item-wrapper">
              <div 
                className={`conv-item ${isExpanded ? 'expanded' : ''}`} 
                title={c.id}
                onClick={() => toggleConversation(c.id)}
              >
                <span className="conv-item-title">{c.title || c.id}</span>
                <span className="conv-item-toggle">{isExpanded ? '▼' : '▶'}</span>
              </div>
              
              {isExpanded && (
                <div className="conv-usage-dropdown">
                  {loadingUsage ? (
                    <div className="usage-loading">Loading...</div>
                  ) : usageData && usageData.data && usageData.data.length > 0 ? (
                    <>
                      <div className="usage-header">
                        <div className="usage-totals">
                          <div className="usage-total-item">
                            <span className="usage-label">Total Tokens:</span>
                            <span className="usage-value">{formatNumber(usageData.totals?.totalTokens || 0)}</span>
                          </div>
                          <div className="usage-total-item">
                            <span className="usage-label">Input:</span>
                            <span className="usage-value">{formatNumber(usageData.totals?.inputTokens || 0)}</span>
                          </div>
                          <div className="usage-total-item">
                            <span className="usage-label">Output:</span>
                            <span className="usage-value">{formatNumber(usageData.totals?.outputTokens || 0)}</span>
                          </div>
                          {usageData.totals?.credit > 0 && (
                            <div className="usage-total-item">
                              <span className="usage-label">Credit:</span>
                              <span className="usage-value">{formatNumber(usageData.totals.credit)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="usage-list">
                        {usageData.data.map((item, index) => (
                          <div key={item.messageId || index} className="usage-item">
                            <div className="usage-item-header">
                              <span className="usage-type">{item.type}</span>
                              {item.agent && (
                                <span className="usage-agent">{item.agent.model}</span>
                              )}
                            </div>
                            <div className="usage-item-details">
                              <div className="usage-detail-row">
                                <span>Input: {formatNumber(item.usage?.inputTokens || 0)}</span>
                                <span>Output: {formatNumber(item.usage?.outputTokens || 0)}</span>
                                <span>Total: {formatNumber(item.usage?.totalTokens || 0)}</span>
                              </div>
                              {item.description && (
                                <div className="usage-description">{item.description}</div>
                              )}
                              {item.createdAt && (
                                <div className="usage-date">{formatDate(item.createdAt)}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="usage-empty">No usage data</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {(!conversations || conversations.length === 0) && (
          <div className="panel-empty">No conversations</div>
        )}
      </div>
      <div className="left-sidebar-footer" style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn-refresh" onClick={loadConversations}>Refresh</button>
      </div>
    </aside>
  );
}

export default ConversationsSidebar;


