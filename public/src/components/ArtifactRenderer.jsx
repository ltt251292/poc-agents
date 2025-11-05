import React, { useEffect, useRef } from 'react';
import { Sandpack, SandpackLayout, SandpackCodeEditor, SandpackPreview, SandpackFileExplorer } from '@codesandbox/sandpack-react';

/**
 * MermaidRenderer component
 * Render mermaid diagram trực tiếp trong React
 */
function MermaidRenderer({ content, title }) {
  const mermaidRef = useRef(null);
  const renderedRef = useRef(false);
  const waitTimerRef = useRef(null);

  useEffect(() => {
    // Reset trạng thái khi content đổi
    renderedRef.current = false;
    if (!mermaidRef.current || !content) return;

    const tryRender = () => {
      if (!(typeof window !== 'undefined' && window.mermaid)) return false;
      try {
        window.mermaid.initialize({ 
          startOnLoad: false, 
          theme: 'default',
          securityLevel: 'loose',
          flowchart: { useMaxWidth: true, htmlLabels: true }
        });
      } catch (e) {
        // Có thể đã initialize
      }

      try {
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        mermaidRef.current.id = id;
        mermaidRef.current.textContent = content;
        window.mermaid.init(undefined, mermaidRef.current);
        renderedRef.current = true;
        return true;
      } catch (error) {
        console.error('Error rendering mermaid:', error);
        if (mermaidRef.current) {
          mermaidRef.current.textContent = `Error rendering mermaid diagram: ${error.message}\n\nOriginal content:\n${content}`;
        }
        return true; // dừng polling nếu lỗi
      }
    };

    if (tryRender()) return;

    let attempts = 0;
    waitTimerRef.current = window.setInterval(() => {
      attempts += 1;
      if (tryRender() || attempts > 30) {
        window.clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    }, 100);

    return () => {
      if (waitTimerRef.current) {
        window.clearInterval(waitTimerRef.current);
        waitTimerRef.current = null;
      }
    };
  }, [content]);

  return (
    <div className="artifact-renderer">
      {title && (
        <div className="artifact-header">
          <h4>{title}</h4>
          <span className="artifact-type">mermaid</span>
        </div>
      )}
      <div className="artifact-mermaid">
        <div 
          ref={mermaidRef} 
          className="mermaid"
        >
          {!renderedRef.current && content}
        </div>
      </div>
    </div>
  );
}

/**
 * MarkdownRenderer component
 * Render markdown content trực tiếp sang HTML (simple parser, không phụ thuộc thư viện ngoài)
 */
function MarkdownRenderer({ content, title }) {
  const containerRef = useRef(null);

  /**
   * renderMarkdown: Chuyển đổi markdown cơ bản sang HTML an toàn tối thiểu
   */
  const renderMarkdown = (md) => {
    if (!md) return '';

    // Escape HTML trước khi convert markdown để hạn chế XSS
    const escapeHtml = (str) =>
      str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Xử lý code block ``` ```
    let html = md.replace(/```([\s\S]*?)```/g, (m, p1) => {
      return `<pre><code>${escapeHtml(p1)}</code></pre>`;
    });

    // Xử lý inline code `code`
    html = html.replace(/`([^`]+)`/g, (m, p1) => `<code>${escapeHtml(p1)}</code>`);

    // Headings #..######
    html = html.replace(/^######\s+(.*)$/gm, '<h6>$1</h6>')
      .replace(/^#####\s+(.*)$/gm, '<h5>$1</h5>')
      .replace(/^####\s+(.*)$/gm, '<h4>$1</h4>')
      .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>');

    // Bold, Italic
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // Links [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Lists bắt đầu với - hoặc *
    html = html.replace(/^(?:- |\* )(.*)(?:\n(?:- |\* ).*)*/gms, (block) => {
      const items = block.split(/\n/).map(line => line.replace(/^(?:- |\* )/, '').trim());
      return `<ul>${items.map(it => `<li>${it}</li>`).join('')}</ul>`;
    });

    // Paragraphs: bọc các dòng còn lại vào <p>
    html = html.split(/\n{2,}/).map(chunk => {
      const trimmed = chunk.trim();
      if (!trimmed) return '';
      if (/^\s*<(h\d|ul|pre|p|blockquote|table|code)/i.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br/>')}</p>`;
    }).join('');

    return html;
  };

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = renderMarkdown(content || '');
  }, [content]);

  return (
    <div className="artifact-renderer">
      {title && (
        <div className="artifact-header">
          <h4>{title}</h4>
          <span className="artifact-type">markdown</span>
        </div>
      )}
      <div className="artifact-markdown">
        <div ref={containerRef} />
      </div>
    </div>
  );
}

/**
 * SvgRenderer component
 * Render SVG content trực tiếp (innerHTML)
 */
function SvgRenderer({ content, title }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = content || '';
  }, [content]);

  return (
    <div className="artifact-renderer">
      {title && (
        <div className="artifact-header">
          <h4>{title}</h4>
          <span className="artifact-type">svg</span>
        </div>
      )}
      <div className="artifact-svg">
        <div ref={containerRef} />
      </div>
    </div>
  );
}

/**
 * ArtifactRenderer component
 * Hiển thị artifact (code, HTML, React component) sử dụng Sandpack
 */
function ArtifactRenderer({ artifact }) {
  const [allFiles, setAllFiles] = React.useState(null);
  const [loadingFiles, setLoadingFiles] = React.useState(false);

  React.useEffect(() => {
    if (artifact && artifact.id) {
      // Nếu artifact đã có files từ streaming, dùng luôn
      if (artifact.files && Array.isArray(artifact.files) && artifact.files.length > 0) {
        setAllFiles({
          files: artifact.files.map(f => ({
            fileName: f.fileName || f.filePath?.split('/').pop() || 'index',
            content: f.content,
            path: f.filePath || `/${artifact.id}/${f.fileName || 'index'}`,
          })),
          metadata: artifact.metadata,
        });
        setLoadingFiles(false);
        return;
      }

      // Nếu không có files, load từ API
      const loadAllFiles = async () => {
        setLoadingFiles(true);
        try {
          const apiHost = import.meta.env.VITE_API_HOST || 'http://localhost:5000';
          const url = `${apiHost}/api/artifacts/${artifact.id}/files`;
          const res = await fetch(url);
          const json = await res.json();
          setAllFiles(json);
        } catch (error) {
          console.error('Error loading artifact files:', error);
          // Fallback: dùng content từ artifact nếu có
          if (artifact.content) {
            setAllFiles({
              files: [{
                fileName: artifact.filePath || 'index',
                content: artifact.content,
                path: `/${artifact.id}/${artifact.filePath || 'index'}`,
              }],
              metadata: artifact.metadata,
            });
          }
        } finally {
          setLoadingFiles(false);
        }
      };

      loadAllFiles();
    }
  }, [artifact?.id, artifact?.files]);

  if (!artifact || !artifact.id) {
    return null;
  }

  const { id, title, type, language, content = '', metadata, filePath } = artifact;
  
  // Render mermaid trực tiếp không dùng Sandpack
  if (type === 'mermaid') {
    if (loadingFiles && !content) {
      return (
        <div className="artifact-renderer">
          <div className="artifact-header">
            <h4>{title || `Artifact ${id}`}</h4>
            <span className="artifact-type">{type || 'mermaid'}</span>
          </div>
          <div className="artifact-content">Loading artifact content...</div>
        </div>
      );
    }
    const mermaidContent = content || allFiles?.files?.[0]?.content || '';
    return <MermaidRenderer content={mermaidContent} title={title || `Artifact ${id}`} />;
  }
  // Render markdown trực tiếp
  if (type === 'markdown' || type === 'md') {
    return <MarkdownRenderer content={content} title={title || `Artifact ${id}`} />;
  }
  // Render svg trực tiếp
  if (type === 'svg') {
    return <SvgRenderer content={content} title={title || `Artifact ${id}`} />;
  }
  
  // Show loading state
  if (loadingFiles || (!allFiles && !content)) {
    return (
      <div className="artifact-renderer">
        <div className="artifact-header">
          <h4>{title || `Artifact ${id}`}</h4>
          <span className="artifact-type">{type || 'code'}</span>
        </div>
        <div className="artifact-content">Loading artifact content...</div>
      </div>
    );
  }

  // Sử dụng allFiles nếu có, nếu không dùng content từ artifact
  const filesToUse = allFiles?.files || (content ? [{
    fileName: filePath || 'index',
    content: content,
    path: `/${id}/${filePath || 'index'}`,
  }] : []);

  /**
   * Xác định template và files cho Sandpack dựa trên artifact type
   */
  const getSandpackConfig = () => {
    // Tạo files object từ allFiles
    const filesObject = {};
    filesToUse.forEach(file => {
      // Lấy fileName từ file (ưu tiên fileName, sau đó từ filePath hoặc path)
      let fileName = file.fileName;
      
      // Nếu không có fileName, lấy từ filePath hoặc path
      if (!fileName) {
        if (file.filePath) {
          fileName = file.filePath.split('/').pop();
        } else if (file.path) {
          // Xử lý path có thể chứa artifactId, ví dụ: /conv-xxx/index.html
          const pathParts = file.path.split('/').filter(p => p);
          // Lấy phần cuối cùng (tên file)
          fileName = pathParts[pathParts.length - 1] || 'index';
        }
      }
      
      // Nếu vẫn không có fileName, dùng 'index'
      if (!fileName) {
        fileName = 'index';
      }
      
      // Nếu là file HTML và không có extension, thêm .html
      if (type === 'html' && !fileName.includes('.')) {
        fileName = fileName === 'index' ? 'index.html' : `${fileName}.html`;
      }
      
      // Sandpack static template cần path bắt đầu với /
      let sandpackPath = '/' + fileName;
      
      // Đảm bảo file HTML chính luôn là /index.html cho Sandpack static
      if (type === 'html' && fileName.endsWith('.html')) {
        // Nếu là file index.html hoặc file HTML duy nhất, đặt là /index.html
        if (fileName === 'index.html' || filesToUse.length === 1) {
          sandpackPath = '/index.html';
        } else {
          // Giữ nguyên tên file nhưng đảm bảo path đúng format
          sandpackPath = '/' + fileName;
        }
      }
      
      filesObject[sandpackPath] = file.content;
    });

    // Nếu không có files, return null
    if (Object.keys(filesObject).length === 0) {
      return null;
    }
    
    // Debug log để kiểm tra
    console.log('Sandpack files:', Object.keys(filesObject), filesToUse);

    switch (type) {
      case 'react':
      case 'code':
        // Xác định ngôn ngữ và template
        const lang = language || 'javascript';
        let template = 'react';
        
        if (lang === 'typescript' || lang === 'ts') {
          template = 'react-ts';
        } else if (lang === 'vue') {
          template = 'vue';
        } else if (lang === 'angular') {
          template = 'angular';
        } else if (lang === 'python') {
          // Python không có template trong Sandpack, dùng static
          return {
            template: 'static',
            files: filesObject
          };
        }
        
        return {
          template,
          files: filesObject
        };
        
      case 'html': {
        return {
          template: 'static',
          files: filesObject
        };
      }
        
      case 'svg':
      case 'markdown':
      case 'css':
      case 'golang':
      case 'go':
      default:
        return {
          template: 'static',
          files: filesObject
        };
    }
  };

  const sandpackConfig = getSandpackConfig();
  
  if (!sandpackConfig) {
    // Fallback cho các trường hợp không hỗ trợ
    return (
      <div className="artifact-renderer">
        <div className="artifact-header">
          <h4>{title || `Artifact ${id}`}</h4>
          <span className="artifact-type">{type}</span>
        </div>
        <pre className="artifact-content">{content}</pre>
      </div>
    );
  }

  return (
    <div className="artifact-renderer">
      <div className="artifact-header">
        <h4>{title || `Artifact ${id}`}</h4>
        <span className="artifact-type">{type}</span>
      </div>
      <div className="artifact-sandpack">
        <Sandpack
          template={sandpackConfig.template}
          files={sandpackConfig.files}
          theme="light"
        >
          <SandpackLayout style={{ height: '100%' }}>
            <SandpackFileExplorer/>
            <SandpackCodeEditor style={{ height: '100%' }} showLineNumbers showInlineErrors wrapContent />
            <SandpackPreview style={{ height: '100%' }} />
          </SandpackLayout>
        </Sandpack>
      </div>
    </div>
  );
}

export default ArtifactRenderer;

