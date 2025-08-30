import React, { useEffect, useRef, useState } from 'react'

export default function RelationsGraph({ noteId, onNodeClick }) {
  const containerRef = useRef()
  const [nodes, setNodes] = useState([])
  const [links, setLinks] = useState([])
  const [selectedNode, setSelectedNode] = useState(null)

  useEffect(() => {
    if (noteId) {
      loadGraphData(noteId)
    }
  }, [noteId])

  const loadGraphData = async (id) => {
    try {
      // Mock data - replace with actual API calls
      const mockNodes = [
        { id: `note:${id}`, type: 'note', label: 'Current Note', color: '#1f6feb' },
        { id: 'verse:1001', type: 'verse', label: 'Genesis 1:1', color: '#28a745' },
        { id: 'verse:1002', type: 'verse', label: 'Genesis 1:2', color: '#28a745' },
        { id: 'entity:creation', type: 'entity', label: 'Creation', color: '#fd7e14' },
        { id: 'doc:commentary1', type: 'document', label: 'Henry Commentary', color: '#6f42c1' },
        { id: 'period:primeval', type: 'period', label: 'Primeval History', color: '#20c997' }
      ]

      const mockLinks = [
        { source: `note:${id}`, target: 'verse:1001', type: 'references' },
        { source: `note:${id}`, target: 'verse:1002', type: 'references' },
        { source: 'verse:1001', target: 'entity:creation', type: 'mentions' },
        { source: 'verse:1002', target: 'entity:creation', type: 'mentions' },
        { source: `note:${id}`, target: 'doc:commentary1', type: 'cites' },
        { source: 'entity:creation', target: 'period:primeval', type: 'occurs_in' },
        { source: 'verse:1001', target: 'verse:1002', type: 'cross_reference' }
      ]

      setNodes(mockNodes)
      setLinks(mockLinks)
    } catch (error) {
      console.error('Failed to load graph data:', error)
    }
  }

  const handleNodeClick = (node) => {
    setSelectedNode(node)
    onNodeClick?.(node)
  }

  const getNodeIcon = (type) => {
    switch (type) {
      case 'note': return '📝'
      case 'verse': return '📖'
      case 'entity': return '🏛️'
      case 'document': return '📄'
      case 'period': return '⏰'
      default: return '●'
    }
  }

  return (
    <div className="relations-graph">
      <div className="graph-header">
        <h4>Relations</h4>
        <div className="graph-controls">
          <button onClick={() => loadGraphData(noteId)}>🔄</button>
          <button onClick={() => setNodes([])}>🗑️</button>
        </div>
      </div>

      <div className="graph-container" ref={containerRef}>
        {/* Simple node-link visualization */}
        <svg width="100%" height="300" className="graph-svg">
          {/* Links */}
          {links.map((link, i) => {
            const sourceNode = nodes.find(n => n.id === link.source)
            const targetNode = nodes.find(n => n.id === link.target)
            if (!sourceNode || !targetNode) return null

            // Simple positioning - in a real app, use force simulation
            const sourceX = 50 + (nodes.indexOf(sourceNode) % 4) * 120
            const sourceY = 50 + Math.floor(nodes.indexOf(sourceNode) / 4) * 80
            const targetX = 50 + (nodes.indexOf(targetNode) % 4) * 120
            const targetY = 50 + Math.floor(nodes.indexOf(targetNode) / 4) * 80

            return (
              <line
                key={i}
                x1={sourceX}
                y1={sourceY}
                x2={targetX}
                y2={targetY}
                stroke="#666"
                strokeWidth="1"
                opacity="0.6"
              />
            )
          })}

          {/* Nodes */}
          {nodes.map((node, i) => {
            const x = 50 + (i % 4) * 120
            const y = 50 + Math.floor(i / 4) * 80

            return (
              <g key={node.id} onClick={() => handleNodeClick(node)}>
                <circle
                  cx={x}
                  cy={y}
                  r="20"
                  fill={node.color}
                  stroke={selectedNode?.id === node.id ? '#fff' : 'none'}
                  strokeWidth="2"
                  className="graph-node"
                />
                <text
                  x={x}
                  y={y + 35}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#e9edf1"
                  className="node-label"
                >
                  {node.label.length > 12 ? node.label.slice(0, 12) + '...' : node.label}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {selectedNode && (
        <div className="node-details">
          <div className="node-info">
            <span className="node-icon">{getNodeIcon(selectedNode.type)}</span>
            <div>
              <div className="node-title">{selectedNode.label}</div>
              <div className="node-type">{selectedNode.type}</div>
            </div>
          </div>
          <div className="node-actions">
            <button onClick={() => onNodeClick?.(selectedNode)}>
              Open
            </button>
            <button onClick={() => setSelectedNode(null)}>
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="graph-legend">
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#1f6feb'}}></span>
          Notes
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#28a745'}}></span>
          Verses
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#fd7e14'}}></span>
          Entities
        </div>
        <div className="legend-item">
          <span className="legend-color" style={{backgroundColor: '#6f42c1'}}></span>
          Documents
        </div>
      </div>
    </div>
  )
}
