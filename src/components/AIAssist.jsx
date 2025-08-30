import React, { useState } from 'react'

const AI_PROMPTS = {
  sermonCoach: {
    title: 'Sermon Coach',
    description: 'Structure and improve sermon content',
    prompt: `You are a sermon writing coach. Help improve this sermon by:
1. Suggesting a compelling hook for the introduction
2. Ensuring 3-point structure is clear and logical  
3. Verifying historical context matches the biblical period
4. Adding relevant cross-references
5. Strengthening application points
6. Citing sources properly

Current sermon content: {content}
Verse context: {verses}
Available sources: {sources}`
  },
  factChecker: {
    title: 'Historical Fact-Check',
    description: 'Verify historical accuracy and timeline',
    prompt: `You are a biblical historian. Review this content for accuracy:
1. Check dates against known historical periods
2. Verify archaeological claims
3. Note any scholarly disagreements
4. Suggest additional sources
5. Flag potential anachronisms

Content to check: {content}
Timeline context: {timeline}
Available sources: {sources}`
  },
  clarityPass: {
    title: 'Clarity Rewrite',
    description: 'Improve readability while preserving theology',
    prompt: `Rewrite this content for clarity:
1. Use grade 8-10 reading level
2. Preserve all theological accuracy
3. Keep citations intact
4. Make complex concepts accessible
5. Maintain respectful tone

Content: {content}`
  },
  parallelFinder: {
    title: 'Find Parallels',
    description: 'Discover related passages and themes',
    prompt: `Find parallel passages and themes for these verses:
1. List strong textual parallels with brief justification
2. Note thematic connections across Testament
3. Highlight word studies (Hebrew/Greek connections)
4. Suggest cross-references for deeper study

Verses: {verses}
Current context: {content}`
  },
  outlineGenerator: {
    title: 'Generate Outline',
    description: 'Create structured outline from content',
    prompt: `Create a clear outline from this content:
1. Extract main points and sub-points
2. Suggest logical flow improvements
3. Add transition suggestions
4. Note areas needing development

Content: {content}`
  }
}

export default function AIAssist({ currentNote, selectedSources, onInsertText }) {
  const [activePrompt, setActivePrompt] = useState(null)
  const [customPrompt, setCustomPrompt] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState('')

  const executePrompt = async (promptKey, customText = '') => {
    setIsProcessing(true)
    setActivePrompt(promptKey)
    
    try {
      const prompt = promptKey === 'custom' ? customText : AI_PROMPTS[promptKey]?.prompt
      
      // Replace placeholders with actual content
      const processedPrompt = prompt
        .replace('{content}', currentNote?.content || '')
        .replace('{verses}', currentNote?.verse_ids?.join(', ') || '')
        .replace('{sources}', selectedSources?.map(s => s.title).join(', ') || '')
        .replace('{timeline}', 'Biblical timeline context') // TODO: get from timeline data
      
      const response = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: processedPrompt,
          sources: selectedSources,
          noteId: currentNote?.id
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setResult(data.result)
      } else {
        setResult('Error: Could not process request')
      }
    } catch (error) {
      setResult('Error: ' + error.message)
    }
    
    setIsProcessing(false)
  }

  const insertResult = () => {
    if (result && onInsertText) {
      onInsertText(result)
      setResult('')
    }
  }

  return (
    <div className="ai-assist">
      <div className="assist-header">
        <h3>AI Assistant</h3>
      </div>

      <div className="prompt-presets">
        <h4>Quick Actions</h4>
        {Object.entries(AI_PROMPTS).map(([key, prompt]) => (
          <button
            key={key}
            onClick={() => executePrompt(key)}
            disabled={isProcessing}
            className={`prompt-btn ${activePrompt === key ? 'active' : ''}`}
          >
            <div className="prompt-title">{prompt.title}</div>
            <div className="prompt-desc">{prompt.description}</div>
          </button>
        ))}
      </div>

      <div className="custom-prompt">
        <h4>Custom Prompt</h4>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Enter your custom AI prompt..."
          rows={4}
          className="custom-prompt-input"
        />
        <button
          onClick={() => executePrompt('custom', customPrompt)}
          disabled={isProcessing || !customPrompt.trim()}
          className="execute-btn"
        >
          Execute
        </button>
      </div>

      {isProcessing && (
        <div className="processing">
          <div className="spinner">⏳</div>
          <span>Processing...</span>
        </div>
      )}

      {result && (
        <div className="ai-result">
          <div className="result-header">
            <h4>AI Response</h4>
            <div className="result-actions">
              <button onClick={insertResult} className="insert-btn">
                Insert
              </button>
              <button onClick={() => setResult('')} className="clear-btn">
                Clear
              </button>
            </div>
          </div>
          <div className="result-content">
            <pre>{result}</pre>
          </div>
        </div>
      )}

      <div className="context-info">
        <h4>Context</h4>
        <div className="context-item">
          <strong>Note Type:</strong> {currentNote?.type || 'None'}
        </div>
        <div className="context-item">
          <strong>Linked Verses:</strong> {currentNote?.verse_ids?.length || 0}
        </div>
        <div className="context-item">
          <strong>Sources:</strong> {selectedSources?.length || 0}
        </div>
      </div>
    </div>
  )
}
