import React from 'react';
import { useChat } from '../hooks/useChat';

/**
 * AttachmentsPanel component
 * Hiển thị kết quả tìm kiếm (organic results) từ serper tool
 */
function AttachmentsPanel() {
  const { attachments } = useChat();

  if (!attachments) {
    return (
      <div className="sidebar attachments-panel">
        <h1>🔎 Search results</h1>
        <div id="attachmentsContainer" className="attachments-container"></div>
      </div>
    );
  }

  const payload = attachments && attachments.data ? attachments.data : null;
  if (!payload) return null;

  // Support both shapes: { data: { result: {...} }} and { data: { ...direct... }}
  const result = payload && payload.result ? payload.result : payload;
  const organic = Array.isArray(result.organic) ? result.organic : [];
  
  if (organic.length === 0) {
    return (
      <div className="sidebar attachments-panel">
        <h1>🔎 Search results</h1>
        <div id="attachmentsContainer" className="attachments-container"></div>
      </div>
    );
  }

  const q = (result.searchParameters && result.searchParameters.q)
    ? result.searchParameters.q
    : (payload.args && payload.args.query ? payload.args.query : '');
  const credits = typeof result.credits === 'number' ? result.credits : undefined;

  /**
   * Extract domain from URL
   */
  const getDomain = (url) => {
    try {
      return new URL(url).hostname.replace(/^www\./, '');
    } catch (e) {
      return '';
    }
  };

  /**
   * Get favicon URL from domain
   */
  const getFaviconUrl = (domain) => {
    return domain ? `https://www.google.com/s2/favicons?domain=${domain}` : '';
  };

  return (
    <div className="sidebar attachments-panel">
      <h1>🔎 Search results</h1>
      <div id="attachmentsContainer" className="attachments-container">
        <div className="attachments">
          <div className="attachments-header">🔎 Search results</div>
          {q && (
            <div className="attachments-subtitle">
              Query: <span className="attachments-query">{q}</span>
              {credits !== undefined && ` · Credits: ${credits}`}
            </div>
          )}
          <ol className="attachments-list">
            {organic.slice(0, 10).map((item, index) => {
              const title = item.title || 'Untitled';
              const link = item.link || '#';
              const snippet = item.snippet || '';
              const position = typeof item.position === 'number' ? item.position : '';
              const date = item.date || '';
              const domain = getDomain(link);
              const favicon = getFaviconUrl(domain);

              return (
                <li key={index} className="attachment-item">
                  <div className="attachment-source">
                    {favicon && (
                      <img 
                        className="attachment-favicon" 
                        src={favicon} 
                        alt="" 
                      />
                    )}
                    {domain && (
                      <span className="attachment-domain">{domain}</span>
                    )}
                  </div>
                  <div className="attachment-title">
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      {title}
                    </a>
                    {position !== '' && (
                      <span className="attachment-position"> (#{position})</span>
                    )}
                  </div>
                  {date && (
                    <div className="attachment-meta">{date}</div>
                  )}
                  <div className="attachment-snippet">{snippet}</div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}

export default AttachmentsPanel;

