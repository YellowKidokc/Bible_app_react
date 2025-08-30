import React, { createContext, useContext, useEffect, useState } from 'react'

const defaultSettings = {
  sections: {
    text: 'always',
    xrefs: 'onExpand',
    strongs: 'onExpand',
    timeline: 'onExpand',
    commentary: { mhc:'onExpand', mcarthur:'onExpand', gill:'hidden' },
    media: 'onExpand',
    notes: 'onExpand',
  },
}

const Ctx = createContext({ settings: defaultSettings, setSettings: () => {} })

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(() => {
    const raw = localStorage.getItem('settings')
    return raw ? JSON.parse(raw) : defaultSettings
  })
  useEffect(() => localStorage.setItem('settings', JSON.stringify(settings)), [settings])
  return <Ctx.Provider value={{ settings, setSettings }}>{children}</Ctx.Provider>
}

export const useSettings = () => useContext(Ctx)
