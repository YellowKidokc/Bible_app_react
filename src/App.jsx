import React, { useState } from 'react'
import EnhancedReader from './EnhancedReader.jsx'
import NotesWorkspace from './components/NotesWorkspace.jsx'
import SettingsPage from './components/SettingsPage.jsx'
import { SettingsProvider } from './settings.jsx'

export default function App() {
  const [currentView, setCurrentView] = useState('read') // 'read', 'notes', 'settings'

  return (
    <SettingsProvider>
      <div className="app">
        <header className="topbar">
          <h1>Bible Study App</h1>
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
            <button
              onClick={() => setCurrentView('settings')}
              className={currentView === 'settings' ? 'active' : ''}
            >
              Settings
            </button>
          </nav>
        </header>
        <main className={currentView === 'read' ? 'reader-main' : 'page'}>
          {currentView === 'read' && <EnhancedReader />}
          {currentView === 'notes' && <NotesWorkspace />}
          {currentView === 'settings' && <SettingsPage />}
        </main>
      </div>
    </SettingsProvider>
  )
}
