import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../hooks/useChat';

/**
 * MemoriesDropdown component
 * Hiển thị dropdown với danh sách memories của người dùng
 */
function MemoriesDropdown() {
  const { config, loadMemories, memories } = useChat();
  const [isOpen, setIsOpen] = useState(false);
  const [loadingMemories, setLoadingMemories] = useState(false);
  const dropdownRef = useRef(null);

  /**
   * Load memories khi dropdown được mở
   */
  useEffect(() => {
    if (isOpen && config.userId && config.userId.trim()) {
      setLoadingMemories(true);
      loadMemories()
        .then(() => {
          setLoadingMemories(false);
        })
        .catch((error) => {
          console.error('Error loading memories:', error);
          setLoadingMemories(false);
        });
    }
  }, [isOpen, config.userId, loadMemories]);

  /**
   * Đóng dropdown khi click bên ngoài
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  /**
   * Toggle dropdown
   */
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  /**
   * Format date để hiển thị
   */
  const formatDate = (dateString) => {
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
    <div className="memories-dropdown-wrapper" ref={dropdownRef}>
      <button
        className="btn-memories"
        onClick={toggleDropdown}
        type="button"
      >
        💭 Memories
        {memories && memories.length > 0 && (
          <span className="memories-badge">{memories.length}</span>
        )}
      </button>

      {isOpen && (
        <div className="memories-dropdown">
          <div className="memories-dropdown-header">
            <h3>Memories</h3>
            <button
              className="btn-close"
              onClick={() => setIsOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>
          
          <div className="memories-dropdown-content">
            {!config.userId || !config.userId.trim() ? (
              <div className="memories-empty">
                Vui lòng nhập User ID để xem memories
              </div>
            ) : loadingMemories ? (
              <div className="memories-empty">Loading...</div>
            ) : memories && memories.length > 0 ? (
              <div className="memories-list">
                {memories.map((memory) => (
                  <div key={memory._id || memory.id} className="memory-item">
                    <div className="memory-header">
                      <span className="memory-type">{memory.type}</span>
                      {memory.confidence !== undefined && (
                        <span className="memory-confidence">
                          Confidence: {memory.confidence}
                        </span>
                      )}
                    </div>
                    <div className="memory-value">{memory.value}</div>
                    {memory.targetId && (
                      <div className="memory-target">
                        Target ID: {memory.targetId}
                      </div>
                    )}
                    {memory.createdAt && (
                      <div className="memory-date">
                        {formatDate(memory.createdAt)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="memories-empty">
                Không có memories nào cho user này
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemoriesDropdown;

