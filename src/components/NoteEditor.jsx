import React, { useState, useEffect } from 'react'

const NOTE_TEMPLATES = {
  sermon: {
    title: 'Sermon Template',
    content: `---
type: sermon
verse_ids: []
tags: []
---

# Sermon Title

## Hook
*Opening illustration or question*

## Text
*Primary passage and context*

## Exegesis
### Historical Context
### Literary Context
### Theological Themes

## Application
### For Today
### Action Steps

## Conclusion
*Call to response*

## References
- 
`
  },
  historical: {
    title: 'Historical Study',
    content: `---
type: historical
verse_ids: []
tags: []
---

# Historical Study: [Topic]

## Context
*Time period and setting*

## Primary Sources
- 

## Archaeological Evidence
- 

## Scholarly Debates
### Position A
### Position B
### My Assessment

## Conclusion
*Summary and implications*
`
  },
  facts: {
    title: 'Bible Facts',
    content: `---
type: facts
verse_ids: []
tags: []
---

# Bible Fact: [Claim]

## The Claim
*What is being asserted*

## Supporting Verses
- 

## Cross-References
- 

## Additional Evidence
- 

## Potential Objections
- 

## Conclusion
*Confidence level and caveats*
`
  },
  devotional: {
    title: 'Devotional',
    content: `---
type: devotional
verse_ids: []
tags: []
---

# Devotional: [Title]

## Scripture
*Primary verse(s)*

## Observation
*What does the text say?*

## Interpretation
*What does it mean?*

## Application
*How does this apply to my life?*

## Prayer
*Response to God*
`
  }
}

export default function NoteEditor({ note, onNoteChange, availableSources }) {
  const [content, setContent] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)

  useEffect(() => {
    if (note) {
      setContent(note.content || '')
    }
  }, [note])

  const insertTemplate = (templateKey) => {
    const template = NOTE_TEMPLATES[templateKey]
    setContent(template.content)
    setShowTemplates(false)
    onNoteChange?.({ ...note, content: template.content })
  }

  const insertCitation = (source) => {
    const citation = `[^${source.id}]: ${source.title}, p. ${source.page || '?'}`
    const newContent = content + '\n\n' + citation
    setContent(newContent)
    onNoteChange?.({ ...note, content: newContent })
  }

  const handleSlashCommand = (command) => {
    switch (command) {
      case '/template':
        setShowTemplates(true)
        break
      case '/cite':
        // Show citation picker
        break
      case '/outline':
        // Generate AI outline
        break
    }
  }

  return (
    <div className="note-editor">
      <div className="editor-toolbar">
        <button onClick={() => setShowTemplates(true)}>
          Templates
        </button>
        <button onClick={() => handleSlashCommand('/cite')}>
          Cite Sources
        </button>
        <button onClick={() => handleSlashCommand('/outline')}>
          AI Outline
        </button>
      </div>

      {showTemplates && (
        <div className="template-picker">
          <h3>Choose Template</h3>
          {Object.entries(NOTE_TEMPLATES).map(([key, template]) => (
            <button 
              key={key}
              onClick={() => insertTemplate(key)}
              className="template-option"
            >
              {template.title}
            </button>
          ))}
          <button onClick={() => setShowTemplates(false)}>Cancel</button>
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
          onNoteChange?.({ ...note, content: e.target.value })
        }}
        placeholder="Start typing or use /template to begin..."
        className="editor-textarea"
        rows={30}
      />

      {availableSources?.length > 0 && (
        <div className="sources-panel">
          <h4>Available Sources</h4>
          {availableSources.map(source => (
            <div key={source.id} className="source-item">
              <span>{source.title}</span>
              <button onClick={() => insertCitation(source)}>
                Cite
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
