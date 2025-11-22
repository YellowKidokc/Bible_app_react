import React, { useState } from 'react'
import { useSettings } from '../store/settings.js'

export default function SettingsPage() {
  const store = useSettings()
  const { layout, ai, sections, commentaries } = store

  const [showApiKey, setShowApiKey] = useState(false)

  const handlePanelContentToggle = (panel, content) => {
    const currentContent = layout[panel].defaultContent || []
    const newContent = currentContent.includes(content)
      ? currentContent.filter(c => c !== content)
      : [...currentContent, content]
    store.setPanelContent(panel, newContent)
  }

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      {/* Layout Configuration */}
      <section className="settings-section">
        <h3>Layout Configuration</h3>

        <div className="setting-group">
          <label>Layout Mode</label>
          <select
            value={layout.mode}
            onChange={(e) => store.setLayoutMode(e.target.value)}
          >
            <option value="single">Single Panel</option>
            <option value="two-panel">Two Panels</option>
            <option value="three-panel">Three Panels</option>
          </select>
        </div>

        {layout.mode !== 'single' && (
          <>
            <h4>Left Panel</h4>
            <div className="content-checkboxes">
              <label>
                <input
                  type="checkbox"
                  checked={layout.leftPanel.defaultContent?.includes('commentaries')}
                  onChange={() => handlePanelContentToggle('leftPanel', 'commentaries')}
                />
                Commentaries
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={layout.leftPanel.defaultContent?.includes('crossRefs')}
                  onChange={() => handlePanelContentToggle('leftPanel', 'crossRefs')}
                />
                Cross-References
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={layout.leftPanel.defaultContent?.includes('notes')}
                  onChange={() => handlePanelContentToggle('leftPanel', 'notes')}
                />
                Personal Notes
              </label>
            </div>

            {layout.mode === 'three-panel' && (
              <>
                <h4>Right Panel</h4>
                <div className="content-checkboxes">
                  <label>
                    <input
                      type="checkbox"
                      checked={layout.rightPanel.defaultContent?.includes('ai')}
                      onChange={() => handlePanelContentToggle('rightPanel', 'ai')}
                    />
                    AI Assistant
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={layout.rightPanel.defaultContent?.includes('strongs')}
                      onChange={() => handlePanelContentToggle('rightPanel', 'strongs')}
                    />
                    Greek/Hebrew Lexicon
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={layout.rightPanel.defaultContent?.includes('timeline')}
                      onChange={() => handlePanelContentToggle('rightPanel', 'timeline')}
                    />
                    Timeline
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={layout.rightPanel.defaultContent?.includes('media')}
                      onChange={() => handlePanelContentToggle('rightPanel', 'media')}
                    />
                    Media
                  </label>
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* AI Configuration */}
      <section className="settings-section">
        <h3>AI Configuration</h3>

        <div className="setting-group">
          <label>AI Provider</label>
          <select
            value={ai.provider}
            onChange={(e) => store.setAIProvider(e.target.value)}
          >
            <option value="anthropic">Anthropic Claude</option>
            <option value="openai">OpenAI GPT</option>
          </select>
        </div>

        <div className="setting-group">
          <label>API Key</label>
          <div className="api-key-input">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={ai.apiKey}
              onChange={(e) => store.setAIKey(e.target.value)}
              placeholder="Enter your API key"
            />
            <button onClick={() => setShowApiKey(!showApiKey)}>
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="help-text">
            {ai.provider === 'anthropic'
              ? 'Get your API key from console.anthropic.com'
              : 'Get your API key from platform.openai.com'}
          </p>
        </div>

        {ai.provider === 'anthropic' && (
          <div className="setting-group">
            <label>Model</label>
            <select
              value={ai.model}
              onChange={(e) => store.setAIModel(e.target.value)}
            >
              <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
              <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            </select>
          </div>
        )}

        {ai.provider === 'openai' && (
          <div className="setting-group">
            <label>Model</label>
            <select
              value={ai.model}
              onChange={(e) => store.setAIModel(e.target.value)}
            >
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
            </select>
          </div>
        )}
      </section>

      {/* Commentary Providers */}
      <section className="settings-section">
        <h3>Commentary Providers</h3>
        <div className="commentary-toggles">
          {Object.keys(commentaries).map(provider => (
            <div key={provider} className="toggle-item">
              <label>{provider.toUpperCase()}</label>
              <select
                value={commentaries[provider]}
                onChange={(e) => store.setCommentaryMode(provider, e.target.value)}
              >
                <option value="always">Always Show</option>
                <option value="onExpand">Show on Expand</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Section Visibility */}
      <section className="settings-section">
        <h3>Section Visibility</h3>
        <div className="section-toggles">
          {Object.keys(sections).map(section => (
            <div key={section} className="toggle-item">
              <label>{section.charAt(0).toUpperCase() + section.slice(1)}</label>
              <select
                value={sections[section]}
                onChange={(e) => store.setSectionMode(section, e.target.value)}
              >
                <option value="always">Always Show</option>
                <option value="onExpand">Show on Expand</option>
                <option value="hidden">Hidden</option>
              </select>
            </div>
          ))}
        </div>
      </section>

      {/* Reset Settings */}
      <section className="settings-section">
        <button
          className="reset-btn"
          onClick={() => {
            if (confirm('Reset all settings to defaults?')) {
              store.resetSettings()
            }
          }}
        >
          Reset to Defaults
        </button>
      </section>
    </div>
  )
}
