import React, { useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';

/**
 * ChatMessages component
 * Hiển thị danh sách tin nhắn trong cuộc trò chuyện
 */
function ChatMessages() {
  const { messages } = useChat();
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
      <div 
        className="message-content"
        dangerouslySetInnerHTML={{ __html: message.html || message.text }}
      />
      <div className="message-time">{message.timestamp}</div>
    </div>
  );
}

export default ChatMessages;

