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
      updateSettings: (updates) => set(state => ({ ...state, ...updates }))
    }),
    {
      name: 'bible-app-settings',
      version: 1
    }
  )
);
