import React from 'react';
import ArtifactRenderer from './ArtifactRenderer';

/**
 * ArtifactModal component
 * Popup modal để hiển thị artifact khi user click nút "Xem artifact"
 */
function ArtifactModal({ artifact, isOpen, onClose }) {
  if (!isOpen || !artifact) return null;

  /**
   * Handle click outside modal để đóng
   */
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * Handle ESC key để đóng modal
   */
  React.useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // Prevent body scroll
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  return (
    <div className="artifact-modal-backdrop" onClick={handleBackdropClick}>
      <div className="artifact-modal-content">
        <div className="artifact-modal-header">
          <h3>{artifact.title || `Artifact ${artifact.id}`}</h3>
          <button 
            className="artifact-modal-close" 
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="artifact-modal-body">
          <ArtifactRenderer artifact={artifact} />
        </div>
      </div>
    </div>
  );
}

export default ArtifactModal;

