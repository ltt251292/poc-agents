import React, { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';

// Map cố định từ stepId -> nhãn hiển thị trên web
const STEP_TITLES = {
  'proposer-initial': 'Proposer: Lập luận ban đầu',
  'opposer-rebuttal': 'Opposer: Phản biện',
  'proposer-counter': 'Proposer: Phản biện lại',
  'moderator-summary': 'Moderator: Tóm tắt & Kết luận',
};

/**
 * Lấy nhãn hiển thị cho stepId; fallback về chính stepId nếu chưa định nghĩa
 * @param {string} stepId
 * @returns {string}
 */
function getStepLabel(stepId) {
  return STEP_TITLES[stepId] || stepId;
}

/**
 * ChatMessages component
 * Hiển thị danh sách tin nhắn trong cuộc trò chuyện
 */
function ChatMessages() {
  const { messages, attachments } = useChat();
  const messagesEndRef = useRef(null);

  /**
   * Auto scroll to bottom when new message arrives
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Render mermaid diagrams sau khi messages được render
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && window.mermaid) {
      // Tìm tất cả các mermaid elements chưa được render
      const mermaidElements = document.querySelectorAll('.mermaid:not([data-processed])');
      if (mermaidElements.length > 0) {
        // Đánh dấu các elements đã được xử lý
        mermaidElements.forEach((element) => {
          element.setAttribute('data-processed', 'true');
        });
        
        // Render tất cả mermaid diagrams
        // Sử dụng setTimeout để đảm bảo DOM đã sẵn sàng
        setTimeout(() => {
          try {
            window.mermaid.contentLoaded();
          } catch (error) {
            console.error('Error rendering mermaid diagrams:', error);
            // Fallback: render từng element một
            mermaidElements.forEach((element) => {
              try {
                const id = element.id || `mermaid-${Date.now()}-${Math.random()}`;
                if (!element.id) element.id = id;
                window.mermaid.init(undefined, element);
              } catch (e) {
                console.error('Error rendering individual mermaid:', e);
              }
            });
          }
        }, 100);
      }
    }
  }, [messages]);

  /**
   * Render welcome message if no messages
   */
  if (messages.length === 0) {
    return (
      <div className="chat-messages" id="chatMessages">
        <div className="welcome-message">
          <h2>Welcome to AI Agent Chat! 👋</h2>
          <p>Configure your agent settings on the left and start chatting below.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages" id="chatMessages">
      <InlineSearchSummary attachments={attachments} />
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

/**
 * MessageItem component
 * Hiển thị từng tin nhắn (user, assistant, typing, error)
 */
function MessageItem({ message }) {
  if (message.type === 'typing') {
    return (
      <div className="message assistant typing">
        <div className="message-content">
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`message ${message.type}`}>
      {message.stepId && (
        <div className="message-meta">
          <span className="step-badge">{getStepLabel(message.stepId)}</span>
        </div>
      )}
      <div 
        className="message-content"
        dangerouslySetInnerHTML={{ __html: message.html || message.text }}
      />
      <div className="message-time">{message.timestamp}</div>
    </div>
  );
}

export default ChatMessages;

/**
 * InlineSearchSummary component
 * Hiển thị tóm tắt kết quả tìm kiếm ngay trong khung chat (như hình mẫu)
 */
function InlineSearchSummary({ attachments }) {
  if (!attachments) return null;

  const payload = attachments?.data?.data || attachments?.data;
  const result = payload?.result || payload;
  const organic = Array.isArray(result?.organic) ? result.organic : [];
  if (organic.length === 0) return null;

  const remaining = Math.max(organic.length - 3, 0);

  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  };

  const getFaviconUrl = (domain) => (domain ? `https://www.google.com/s2/favicons?domain=${domain}` : '');

  return (
    <div className="search-summary">
      <div className="search-summary-header">
        <span className="search-summary-title">Hoàn tất tìm kiếm</span>
        <div className="search-summary-tabs">
          <span className="tab active">Tất cả</span>
          <span className="tab">Tin tức</span>
        </div>
      </div>
      <div className="search-summary-cards">
        {organic.slice(0, 3).map((item, idx) => {
          const domain = getDomain(item.link);
          const favicon = getFaviconUrl(domain);
          return (
            <a
              key={idx}
              className="search-card"
              href={item.link || '#'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="search-card-source">
                {favicon && <img className="search-card-favicon" src={favicon} alt="" />}
                <span className="search-card-domain">{domain}</span>
              </div>
              <div className="search-card-title">{item.title || 'Untitled'}</div>
            </a>
          );
        })}
        {remaining > 0 && (
          <div className="search-card more">
            +{remaining} sources
          </div>
        )}
      </div>
    </div>
  );
}

