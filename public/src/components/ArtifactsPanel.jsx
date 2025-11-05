import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import ArtifactModal from './ArtifactModal';

/**
 * ArtifactsPanel component
 * Hiển thị artifacts trong sidebar bên phải với nút "Xem artifact"
 */
function ArtifactsPanel() {
  const { artifacts } = useChat();
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * Mở modal để xem artifact
   */
  const handleViewArtifact = (artifact) => {
    setSelectedArtifact(artifact);
    setIsModalOpen(true);
  };

  /**
   * Đóng modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedArtifact(null);
  };

  if (artifacts.length === 0) {
    return (
      <div className="sidebar attachments-panel">
        <h1>📦 Artifacts</h1>
        <div className="attachments-container">
          <p style={{ color: '#888', textAlign: 'center', padding: '20px' }}>
            No artifacts yet. Artifacts will appear here when created.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar attachments-panel">
        <h1>📦 Artifacts</h1>
        <div className="attachments-container artifacts-list">
          {artifacts.map((artifact) => (
            <div key={artifact.id} className="artifact-card">
              <div className="artifact-card-header">
                <h4>{artifact.title || `Artifact ${artifact.id}`}</h4>
                <span className="artifact-type">{artifact.type || 'code'}</span>
              </div>
              <div className="artifact-card-body">
                <p className="artifact-description">
                  {artifact.description || `Artifact type: ${artifact.type || 'code'}`}
                </p>
                <button 
                  className="btn-view-artifact"
                  onClick={() => handleViewArtifact(artifact)}
                >
                  Xem artifact
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <ArtifactModal 
        artifact={selectedArtifact} 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
      />
    </>
  );
}

export default ArtifactsPanel;

