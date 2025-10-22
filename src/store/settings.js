/**
 * Global settings store with localStorage persistence
 * Controls which sections show and how (always/onExpand/hidden)
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultSettings = {
  sections: {
    text: 'always',
    crossRefs: 'onExpand',
    strongs: 'onExpand',
    timeline: 'onExpand',
    media: 'onExpand',
    notes: 'onExpand'
  },
  commentaries: {
    mhc: 'onExpand',        // Matthew Henry
    mcarthur: 'onExpand',   // John MacArthur
    gill: 'hidden',         // John Gill
    pulpit: 'hidden',       // Pulpit Commentary
    barnes: 'hidden'        // Albert Barnes
  },
  // Panel layout configuration
  layout: {
    mode: 'three-panel',     // 'single', 'two-panel', 'three-panel'
    leftPanel: {
      enabled: true,
      width: 25,               // percentage
      defaultContent: ['commentaries', 'crossRefs'], // what to show by default
      collapsed: false
    },
    centerPanel: {
      width: 50,               // percentage
      content: ['text']        // always shows Bible text
    },
    rightPanel: {
      enabled: true,
      width: 25,               // percentage
      defaultContent: ['ai', 'strongs', 'timeline'], // AI assistant + resources
      collapsed: false
    }
  },
  // AI configuration
  ai: {
    provider: 'anthropic',    // 'anthropic' or 'openai'
    apiKey: '',               // User's API key
    model: 'claude-3-5-sonnet-20241022', // default model
    features: {
      searchDatabase: true,
      explainScripture: true,
      generateContent: true,
      accessCommentaries: true,
      accessLexicons: true
    }
  },
  theme: 'dark',
  fontSize: 'medium'
};

export const useSettings = create(
  persist(
    (set, get) => ({
      ...defaultSettings,
      
      // Update section visibility
      setSectionMode: (section, mode) => 
        set(state => ({
          sections: { ...state.sections, [section]: mode }
        })),
      
      // Update commentary provider visibility  
      setCommentaryMode: (provider, mode) =>
        set(state => ({
          commentaries: { ...state.commentaries, [provider]: mode }
        })),
      
      // Reset to defaults
      resetSettings: () => set(defaultSettings),
      
      // Bulk update
      updateSettings: (updates) => set(state => ({ ...state, ...updates })),

      // Layout management
      setLayoutMode: (mode) =>
        set(state => ({
          layout: { ...state.layout, mode }
        })),

      setPanelWidth: (panel, width) =>
        set(state => ({
          layout: {
            ...state.layout,
            [panel]: { ...state.layout[panel], width }
          }
        })),

      togglePanel: (panel) =>
        set(state => ({
          layout: {
            ...state.layout,
            [panel]: {
              ...state.layout[panel],
              collapsed: !state.layout[panel].collapsed
            }
          }
        })),

      setPanelContent: (panel, content) =>
        set(state => ({
          layout: {
            ...state.layout,
            [panel]: { ...state.layout[panel], defaultContent: content }
          }
        })),

      // AI settings
      setAIProvider: (provider) =>
        set(state => ({
          ai: { ...state.ai, provider }
        })),

      setAIKey: (apiKey) =>
        set(state => ({
          ai: { ...state.ai, apiKey }
        })),

      setAIModel: (model) =>
        set(state => ({
          ai: { ...state.ai, model }
        }))
    }),
    {
      name: 'bible-app-settings',
      version: 1
    }
  )
);
