import React, { useState } from 'react'

export default function Section({ title, defaultOpen=false, children, count }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="section">
      <button className="section-head" onClick={() => setOpen(o => !o)}>
        <span>{title}{typeof count==='number' ? ` (${count})` : ''}</span>
        <span className={`chev ${open ? 'open' : ''}`}>▸</span>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  )
}
