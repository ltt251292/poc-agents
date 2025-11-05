import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';

/**
 * ChatInput component
 * Form nhập tin nhắn và gửi đến AI Agent
 */
function ChatInput() {
  const { sendMessage, isStreaming } = useChat();
  const [inputValue, setInputValue] = useState('');

  /**
   * Handle key press in input
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * Handle send button click
   */
  const handleSend = () => {
    if (inputValue.trim() && !isStreaming) {
      sendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  return (
    <div className="chat-input-container">
      <input
        type="text"
        id="messageInput"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder="Type your message..."
        disabled={isStreaming}
      />
      <button
        id="sendButton"
        onClick={handleSend}
        disabled={isStreaming || !inputValue.trim()}
      >
        Send
      </button>
    </div>
  );
}

export default ChatInput;

