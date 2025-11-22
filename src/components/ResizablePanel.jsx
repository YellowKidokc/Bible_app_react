import React, { useState, useRef, useEffect } from 'react'

/**
 * Resizable panel component
 * Supports drag-to-resize and collapse/expand
 */
export default function ResizablePanel({
  children,
  side = 'left', // 'left', 'center', 'right'
  initialWidth = 33,
  minWidth = 15,
  maxWidth = 60,
  collapsed = false,
  onWidthChange,
  onToggleCollapse,
  title,
  className = ''
}) {
  const [width, setWidth] = useState(initialWidth)
  const [isResizing, setIsResizing] = useState(false)
  const panelRef = useRef(null)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsResizing(true)
    startXRef.current = e.clientX
    startWidthRef.current = width
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return

      const delta = e.clientX - startXRef.current
      const containerWidth = panelRef.current?.parentElement?.offsetWidth || 1000
      const deltaPercent = (delta / containerWidth) * 100

      let newWidth = startWidthRef.current + (side === 'left' ? deltaPercent : -deltaPercent)
      newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))

      setWidth(newWidth)
      onWidthChange?.(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing, width, side, minWidth, maxWidth, onWidthChange])

  const handleToggle = () => {
    onToggleCollapse?.()
  }

  return (
    <div
      ref={panelRef}
      className={`resizable-panel ${side} ${collapsed ? 'collapsed' : ''} ${className}`}
      style={{
        width: collapsed ? '40px' : `${width}%`,
        minWidth: collapsed ? '40px' : `${minWidth}%`,
        maxWidth: collapsed ? '40px' : `${maxWidth}%`
      }}
    >
      {title && (
        <div className="panel-header">
          <h3>{title}</h3>
          <button
            className="toggle-btn"
            onClick={handleToggle}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? (side === 'left' ? '→' : '←') : (side === 'left' ? '←' : '→')}
          </button>
        </div>
      )}

      <div className="panel-content">
        {!collapsed && children}
      </div>

      {!collapsed && side !== 'center' && (
        <div
          className={`resize-handle ${side}`}
          onMouseDown={handleMouseDown}
          style={{
            cursor: isResizing ? 'col-resize' : 'col-resize'
          }}
        />
      )}
    </div>
  )
}
