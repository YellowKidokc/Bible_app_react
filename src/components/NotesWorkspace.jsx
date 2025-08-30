import React, { useState } from 'react'
import NoteEditor from './NoteEditor.jsx'
import RAGLibrary from './RAGLibrary.jsx'
import AIAssist from './AIAssist.jsx'
import RelationsGraph from './RelationsGraph.jsx'
import VoiceWidget from './VoiceWidget.jsx'

export default function NotesWorkspace() {
  const [currentNote, setCurrentNote] = useState(null)
  const [selectedSources, setSelectedSources] = useState([])
  
  return (
    <div className="notes-workspace">
      {/* Left Rail - RAG Library */}
      <aside className="rag-panel">
        <RAGLibrary 
          onSourceSelect={setSelectedSources}
          selectedSources={selectedSources}
        />
      </aside>

      {/* Center - Note Editor */}
      <main className="editor-panel">
        <NoteEditor 
          note={currentNote}
          onNoteChange={setCurrentNote}
          availableSources={selectedSources}
        />
      </main>

      {/* Right Rail - AI Assist */}
      <aside className="ai-panel">
        <AIAssist 
          currentNote={currentNote}
          selectedSources={selectedSources}
          onInsertText={(text) => {
            // Insert into editor
          }}
        />
      </aside>

      {/* Bottom - Relations Graph */}
      <footer className="graph-panel">
        <RelationsGraph 
          noteId={currentNote?.id}
          onNodeClick={(node) => {
            // Navigate to verse/entity/doc
          }}
        />
      </footer>

      {/* Floating Voice Widget */}
      <VoiceWidget 
        onTranscript={(text) => {
          // Insert into current cursor position
        }}
      />
    </div>
  )
}
