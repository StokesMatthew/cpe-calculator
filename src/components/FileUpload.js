import React, { useState, useRef } from 'react';

function FileUpload({ id, title, description, icon, files = [], onFileSelect, onFileRemove, allowMultiple = false }) {
  const [status, setStatus] = useState({ message: '', type: '' });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const getTotalSummary = () => {
    if (files.length === 0) return '';

    const firstFile = files[0];
    if (!firstFile.data) return '';

    if (Array.isArray(firstFile.data)) {
      let total = 0;
      for (const file of files) {
        total += file.data.length;
      }
      const label = id === 'lookup' ? 'entries' : 'participants';
      return total > 0 ? `${total} ${label} total` : '';
    }

    if (firstFile.data.participantResponses) {
      let totalPolls = 0;
      let totalResponses = 0;
      for (const file of files) {
        totalPolls += file.data.pollCount;
        totalResponses += file.data.participantResponses.length;
      }
      return `${totalPolls} polls, ${totalResponses} responses`;
    }

    return '';
  };

  const handleFileChange = async (file) => {
    if (!file) return;

    setStatus({ message: 'Processing...', type: '' });

    const result = await onFileSelect(file);
    
    if (result) {
      setStatus({
        message: '',
        type: ''
      });
    }
  };

  const handleInputChange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      await handleFileChange(file);
    }
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    const droppedFiles = Array.from(e.dataTransfer.files);
    for (const file of droppedFiles) {
      await handleFileChange(file);
    }
  };

  const handleRemoveFile = (fileName) => {
    if (onFileRemove) {
      onFileRemove(fileName);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className={`upload-box ${isDragOver ? 'drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="upload-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv"
        onChange={handleInputChange}
        style={{ display: 'none' }}
        multiple={allowMultiple}
      />
      <button
        className="btn-upload"
        onClick={() => fileInputRef.current?.click()}
      >
        {allowMultiple && files.length > 0 ? 'Add Another File' : 'Choose File'}
      </button>
      
      {files.length > 0 && (
        <div className="files-list">
          {files.map((file, index) => (
            <div key={index} className="file-name-container">
              <span className="file-name">{file.fileName}</span>
              <button 
                className="file-remove-btn" 
                onClick={() => handleRemoveFile(file.fileName)}
                title="Remove file"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      
      {status.message ? (
        <div className={`upload-status ${status.type}`}>
          {status.message}
        </div>
      ) : files.length > 0 ? (
        <div className="upload-status success">
          ✓ {getTotalSummary()}
        </div>
      ) : null}
    </div>
  );
}

export default FileUpload;

