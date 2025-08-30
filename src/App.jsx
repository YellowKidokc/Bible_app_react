import React, { useState } from 'react'
import Reader from './Reader.jsx'
import NotesWorkspace from './components/NotesWorkspace.jsx'
import { SettingsProvider } from './settings.jsx'

export default function App() {
  const [currentView, setCurrentView] = useState('read') // 'read' or 'notes'

  return (
    <SettingsProvider>
      <div className="app">
        <header className="topbar">
          <h1>Bible App (Hollow)</h1>
          <nav className="nav-tabs">
            <button 
              onClick={() => setCurrentView('read')}
              className={currentView === 'read' ? 'active' : ''}
            >
              Read
            </button>
            <button 
              onClick={() => setCurrentView('notes')}
              className={currentView === 'notes' ? 'active' : ''}
            >
              Notes
            </button>
          </nav>
        </header>
        <main className="page">
          {currentView === 'read' ? <Reader /> : <NotesWorkspace />}
        </main>
      </div>
    </SettingsProvider>
  )
}
