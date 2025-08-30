import React, { useState, useRef } from 'react'

export default function RAGLibrary({ onSourceSelect, selectedSources }) {
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef()

  const handleFileUpload = async (files) => {
    setUploading(true)
    
    for (const file of files) {
      const formData = new FormData()
      formData.append('file', file)
      
      try {
        // Upload to your RAG endpoint
        const response = await fetch('/api/rag/upload', {
          method: 'POST',
          body: formData
        })
        
        if (response.ok) {
          const doc = await response.json()
          setDocuments(prev => [...prev, {
            id: doc.id,
            title: file.name,
            type: file.type,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            chunks: doc.chunks || 0
          }])
        }
      } catch (error) {
        console.error('Upload failed:', error)
      }
    }
    
    setUploading(false)
  }

  const toggleSourceSelection = (doc) => {
    const isSelected = selectedSources.some(s => s.id === doc.id)
    if (isSelected) {
      onSourceSelect(selectedSources.filter(s => s.id !== doc.id))
    } else {
      onSourceSelect([...selectedSources, doc])
    }
  }

  return (
    <div className="rag-library">
      <div className="library-header">
        <h3>Document Library</h3>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="upload-btn"
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.md,.txt"
        onChange={(e) => handleFileUpload(Array.from(e.target.files))}
        style={{ display: 'none' }}
      />

      <div className="search-box">
        <input 
          type="text" 
          placeholder="Search documents..."
          className="search-input"
        />
      </div>

      <div className="documents-list">
        {documents.map(doc => (
          <div 
            key={doc.id} 
            className={`doc-item ${selectedSources.some(s => s.id === doc.id) ? 'selected' : ''}`}
            onClick={() => toggleSourceSelection(doc)}
          >
            <div className="doc-icon">
              {doc.type.includes('pdf') ? '📄' : 
               doc.type.includes('word') ? '📝' : 
               doc.type.includes('text') ? '📋' : '📄'}
            </div>
            <div className="doc-info">
              <div className="doc-title">{doc.title}</div>
              <div className="doc-meta">
                {Math.round(doc.size / 1024)}KB • {doc.chunks} chunks
              </div>
            </div>
            <div className="doc-actions">
              <button onClick={(e) => {
                e.stopPropagation()
                // Preview document
              }}>👁️</button>
              <button onClick={(e) => {
                e.stopPropagation()
                // Delete document
              }}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {selectedSources.length > 0 && (
        <div className="selected-sources">
          <h4>Selected Sources ({selectedSources.length})</h4>
          {selectedSources.map(source => (
            <div key={source.id} className="selected-source">
              {source.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
