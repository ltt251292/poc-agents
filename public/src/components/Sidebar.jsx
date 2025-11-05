import React from 'react';
import { useChat } from '../hooks/useChat';
import MemoriesDropdown from './MemoriesDropdown';

/**
 * Sidebar component
 * Hiển thị form cấu hình cho AI Agent (provider và model)
 */
function Sidebar() {
  const { config, setConfig, clearChat } = useChat();

  /**
   * Handle input change
   */
  const handleChange = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="top-bar">
      <div className="top-bar-content">
        <div className="top-bar-title">🤖 AI Agent</div>
        
        <div className="top-bar-controls">
          <div className="form-group-inline">
            <label htmlFor="mode">Mode:</label>
            <select
              id="mode"
              value={config.mode || 'normal'}
              onChange={(e) => handleChange('mode', e.target.value)}
            >
              <option value="normal">Normal</option>
              <option value="debate">Debate</option>
            </select>
          </div>

          <div className="form-group-inline">
            <label htmlFor="userId">User ID:</label>
            <input
              type="text"
              id="userId"
              value={config.userId}
              onChange={(e) => handleChange('userId', e.target.value)}
              placeholder="user-001"
              className="input-inline"
            />
          </div>
          
          <div className="form-group-inline">
            <label htmlFor="provider">Provider:</label>
            <select
              id="provider"
              value={config.provider}
              onChange={(e) => handleChange('provider', e.target.value)}
            >
              <option value="openai">OpenAI</option>
            </select>
          </div>
          
          <div className="form-group-inline">
            <label htmlFor="model">Model:</label>
            <select
              id="model"
              value={config.model}
              onChange={(e) => handleChange('model', e.target.value)}
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-5">GPT-5</option>
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            </select>
          </div>
          
          <button className="btn-clear-inline" onClick={clearChat}>
            Clear Chat
          </button>
          
          <MemoriesDropdown />
        </div>
      </div>
    </div>
  );
}

export default Sidebar;

