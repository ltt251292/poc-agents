import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { marked } from 'marked';

/**
 * Cấu hình marked để parse markdown
 * Thêm hỗ trợ mermaid code blocks
 */
if (marked) {
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  // Custom renderer cho code blocks để xử lý mermaid
  const renderer = new marked.Renderer();
  const originalCode = renderer.code.bind(renderer);
  
  renderer.code = function(code, language) {
    // Nếu là mermaid code block, wrap trong div với class mermaid
    if (language === 'mermaid') {
      return `<div class="mermaid">${code}</div>`;
    }
    // Giữ nguyên cho các code blocks khác
    return originalCode(code, language);
  };
  
  marked.setOptions({ renderer });
}

/**
 * Context để quản lý state và functions của chat
 */
const ChatContext = createContext(null);

/**
 * ChatProvider component
 * Cung cấp context cho toàn bộ ứng dụng chat
 */
export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [memories, setMemories] = useState([]);
  const [config, setConfig] = useState({
    agentName: 'Customer Support',
    provider: 'openai',
    model: 'gpt-4',
    apiKey: '',
    userId: 'user-001',
    instructions: '',
    mode: 'normal' // 'normal' | 'debate'
  });
  const [attachments, setAttachments] = useState(null);
  const [artifacts, setArtifacts] = useState([]);
  const conversationIdRef = useRef(null);
  const fullResponseRef = useRef('');
  // Map stepId -> { messageId, buffer }
  const stepMessageMapRef = useRef(new Map());
  const stepBufferMapRef = useRef(new Map());

  /**
   * Generate unique conversation ID
   */
  const generateConversationId = useCallback(() => {
    if (!conversationIdRef.current) {
      conversationIdRef.current = `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return conversationIdRef.current;
  }, []);

  /**
   * Parse markdown text to HTML
   */
  const parseMarkdown = useCallback((text) => {
    try {
      return marked.parse(text);
    } catch (e) {
      console.error('Error parsing markdown:', e);
      return text.replace(/\n/g, '<br>');
    }
  }, []);

  /**
   * Add message to chat
   */
  const addMessage = useCallback((text, type, meta = {}) => {
    const message = {
      id: Date.now() + Math.random(),
      text,
      type,
      timestamp: new Date().toLocaleTimeString(),
      html: parseMarkdown(text),
      ...meta
    };
    setMessages(prev => [...prev, message]);
    return message;
  }, [parseMarkdown]);

  /**
   * Add typing indicator
   */
  const addTypingIndicator = useCallback(() => {
    const typingMessage = {
      id: 'typing-' + Date.now(),
      type: 'typing',
      timestamp: new Date().toLocaleTimeString()
    };
    setMessages(prev => [...prev, typingMessage]);
    return typingMessage;
  }, []);

  /**
   * Update message content (for streaming)
   */
  const updateMessage = useCallback((messageId, text) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, text, html: parseMarkdown(text), type: 'assistant' }
        : msg
    ));
  }, [parseMarkdown]);

  /**
   * Remove message (e.g., on error)
   */
  const removeMessage = useCallback((messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);

  /**
   * Show error message
   */
  const showError = useCallback((errorText) => {
    const errorMessage = {
      id: Date.now() + Math.random(),
      text: `Error: ${errorText}`,
      type: 'error',
      timestamp: new Date().toLocaleTimeString(),
      html: `<div class="error-message">Error: ${errorText}</div>`
    };
    setMessages(prev => [...prev, errorMessage]);
  }, []);

  /**
   * Clear chat and start new conversation
   */
  const clearChat = useCallback(() => {
    setMessages([]);
    setAttachments(null);
    setArtifacts([]);
    conversationIdRef.current = null;
    fullResponseRef.current = '';
  }, []);

  /**
   * Handle SSE events from streaming response
   */
  const handleSSEEvent = useCallback((event, data, messageId) => {
    if (event === 'finished') {
      console.log('Stream finished');
      return;
    }

    if (event === 'message') {
      if (data.event === 'on_message_delta' && data.data) {
        const deltaData = data.data;
        const stepId = deltaData?.id;
        
        if (deltaData.delta && deltaData.delta.content) {
          // If has stepId (debate workflow), split messages by step
          if (stepId) {
            // Ensure message exists for this step
            if (!stepMessageMapRef.current.has(stepId)) {
              const msg = addMessage('', 'assistant', { stepId });
              stepMessageMapRef.current.set(stepId, msg.id);
              stepBufferMapRef.current.set(stepId, '');
            }
            const targetMessageId = stepMessageMapRef.current.get(stepId);
            let currentBuffer = stepBufferMapRef.current.get(stepId) || '';

            deltaData.delta.content.forEach(item => {
              if ((item.type === 'text' || item.type === 'text-delta') && item.text) {
                currentBuffer += item.text;
              }
            });
            stepBufferMapRef.current.set(stepId, currentBuffer);
            updateMessage(targetMessageId, currentBuffer);
          } else {
            // Fallback: single assistant message (normal mode)
            deltaData.delta.content.forEach(item => {
              if ((item.type === 'text' || item.type === 'text-delta') && item.text) {
                fullResponseRef.current += item.text;
                updateMessage(messageId, fullResponseRef.current);
              }
            });
          }
        } else if (deltaData.done) {
          console.log('Stream complete');
        }
      }
    } else if (event === 'on_message_delta') {
      if (data.delta && data.delta.content) {
        data.delta.content.forEach(item => {
          if ((item.type === 'text' || item.type === 'text-delta') && item.text) {
            fullResponseRef.current += item.text;
            updateMessage(messageId, fullResponseRef.current);
          }
        });
      } else if (data.done) {
        console.log('Stream complete');
      }
    } else if (event === 'error') {
      showError(data.error || 'Unknown error occurred');
      removeMessage(messageId);
    } else if (event === 'attachments') {
      setAttachments(data);
    } else if (event === 'artifact') {
      // Handle artifact creation/update events
      const artifactData = data.data || data;
      console.log('Received artifact event:', artifactData);
      if (artifactData.id) {
        // Accept artifact even without content - content might be loaded later
        setArtifacts(prev => {
          // Update existing artifact or add new one
          const existingIndex = prev.findIndex(a => a.id === artifactData.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            const existing = updated[existingIndex];
            
            // Nếu có filePath mới, thêm vào danh sách files
            if (artifactData.filePath && artifactData.content) {
              // Tạo hoặc cập nhật files array
              const files = existing.files || [];
              const fileIndex = files.findIndex(f => f.filePath === artifactData.filePath);
              
              if (fileIndex >= 0) {
                // Update file existing
                files[fileIndex] = {
                  fileName: artifactData.filePath.split('/').pop() || artifactData.filePath,
                  filePath: artifactData.filePath,
                  content: artifactData.content,
                  type: artifactData.type,
                  language: artifactData.language,
                };
              } else {
                // Add new file
                files.push({
                  fileName: artifactData.filePath.split('/').pop() || artifactData.filePath,
                  filePath: artifactData.filePath,
                  content: artifactData.content,
                  type: artifactData.type,
                  language: artifactData.language,
                });
              }
              
              updated[existingIndex] = {
                ...existing,
                ...artifactData,
                files: files,
                // Giữ content của file mới nhất để backward compatibility
                content: artifactData.content,
              };
            } else {
              // Update thông tin chung của artifact
              updated[existingIndex] = { ...existing, ...artifactData };
            }
            
            return updated;
          }
          // Artifact mới - tạo files array nếu có filePath
          if (artifactData.filePath && artifactData.content) {
            artifactData.files = [{
              fileName: artifactData.filePath.split('/').pop() || artifactData.filePath,
              filePath: artifactData.filePath,
              content: artifactData.content,
              type: artifactData.type,
              language: artifactData.language,
            }];
          }
          return [...prev, artifactData];
        });
      }
    }

    if (data && data.type === 'finished') {
      console.log('Stream finished');
    }
  }, [updateMessage, showError, removeMessage]);

  /**
   * Send message to AI agent
   */
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isStreaming) return;

    // Validate User ID
    if (!config.userId.trim()) {
      showError('Please enter your User ID in the configuration');
      return;
    }

    // Add user message
    addMessage(messageText, 'user');
    
    // Show typing indicator
    setIsStreaming(true);
    fullResponseRef.current = '';
    stepMessageMapRef.current.clear();
    stepBufferMapRef.current.clear();
    const typingMessage = addTypingIndicator();
    const typingMessageId = typingMessage.id;

    try {
      // Build request payload depending on mode
      const isDebate = config.mode === 'debate';
      const requestConfig = isDebate
        ? {
            model: config.model,
            apiKey: config.apiKey,
            provider: config.provider,
            message: messageText,
          }
        : {
            agentName: config.agentName,
            instructions: config.instructions,
            model: config.model,
            apiKey: config.apiKey,
            tools: [],
            provider: config.provider,
            message: messageText,
            userId: config.userId,
            conversationId: generateConversationId()
          };

      // Get API URL from environment variables
      const apiHost = import.meta.env.VITE_API_HOST || 'http://localhost:5000';
      const defaultPath = import.meta.env.VITE_API_PATH || '/api/agent/chat';
      const debatePath = '/api/workflow/debate';
      const apiUrl = `${apiHost}${isDebate ? debatePath : defaultPath}`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestConfig)
      });

      // Remove typing indicator
      removeMessage(typingMessageId);
      // Only pre-create assistant message for normal mode
      let assistantMessageId = null;
      if (!isDebate) {
        const assistantMessage = addMessage('', 'assistant');
        assistantMessageId = assistantMessage.id;
      }

      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          if (!part.trim()) continue;

          const lines = part.split('\n');
          let event = null;
          let data = null;

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              event = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              try {
                data = JSON.parse(line.slice(6));
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }

          if (event && data) {
            handleSSEEvent(event, data, assistantMessageId);
          } else if (data) {
            handleSSEEvent('data', data, assistantMessageId);
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        let event = null;
        let data = null;

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            event = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              data = JSON.parse(line.slice(6));
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }

        if (event && data) {
          handleSSEEvent(event, data, assistantMessageId);
        } else if (data) {
          handleSSEEvent('data', data, assistantMessageId);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Failed to send message. Please try again.');
      removeMessage(typingMessageId);
    } finally {
      setIsStreaming(false);
    }
  }, [config, isStreaming, addMessage, addTypingIndicator, removeMessage, showError, generateConversationId, handleSSEEvent]);

  const value = {
    messages,
    isStreaming,
    config,
    setConfig,
    attachments,
    artifacts,
    sendMessage,
    clearChat,
    conversations,
    loadConversations: useCallback(async () => {
      try {
        const apiHost = import.meta.env.VITE_API_HOST || 'http://localhost:3000';
        const url = `${apiHost}/api/conversations?userId=${encodeURIComponent(config.userId)}&limit=20`;
        const res = await fetch(url);
        const json = await res.json();
        setConversations(Array.isArray(json.data) ? json.data : []);
        return json;
      } catch (e) {
        console.error('Failed to load conversations', e);
        setConversations([]);
        return { data: [] };
      }
    }, [config.userId]),
    memories,
    /**
     * Load memories từ API
     */
    loadMemories: useCallback(async () => {
      try {
        if (!config.userId || !config.userId.trim()) {
          setMemories([]);
          return { data: [] };
        }
        const apiHost = import.meta.env.VITE_API_HOST || 'http://localhost:5000';
        const url = `${apiHost}/api/memories?userId=${encodeURIComponent(config.userId)}`;
        const res = await fetch(url);
        const json = await res.json();
        setMemories(Array.isArray(json.data) ? json.data : []);
        return json;
      } catch (e) {
        console.error('Failed to load memories', e);
        setMemories([]);
        return { data: [] };
      }
    }, [config.userId]),
    /**
     * Load usage từ API theo conversationId
     */
    loadUsage: useCallback(async (conversationId) => {
      try {
        if (!conversationId || !conversationId.trim()) {
          return { data: [], totals: {}, count: 0 };
        }
        const apiHost = import.meta.env.VITE_API_HOST || 'http://localhost:5000';
        const url = `${apiHost}/api/usage?conversationId=${encodeURIComponent(conversationId)}`;
        const res = await fetch(url);
        const json = await res.json();
        return json;
      } catch (e) {
        console.error('Failed to load usage', e);
        return { data: [], totals: {}, count: 0 };
      }
    }, [])
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

/**
 * Hook để sử dụng chat context
 */
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within ChatProvider');
  }
  return context;
}

