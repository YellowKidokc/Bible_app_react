import React from "react";

export default function SplitView({ left, right, dock = "right" }) {
  const [w, setW] = React.useState(45); // left pane percent width (if dock right, it’s primary)
  const dragging = React.useRef(false);

  function onDown(e) { dragging.current = true; e.preventDefault(); }
  function onMove(e) {
    if (!dragging.current) return;
    const r = e.currentTarget.parentElement.getBoundingClientRect();
    const pct = ((e.clientX - r.left) / r.width) * 100;
    setW(Math.min(80, Math.max(20, pct)));
  }
  function onUp() { dragging.current = false; }

  const leftStyle  = dock === "right" ? { width: `${w}%` } : { width: `${100 - w}%` };
  const rightStyle = dock === "right" ? { width: `${100 - w}%` } : { width: `${w}%` };

  return (
    <div className="split" onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}>
      <div className="pane" style={leftStyle}>{left}</div>
      <div className="divider" onMouseDown={onDown} title="Drag to resize" />
      <div className="pane" style={rightStyle}>{right}</div>
    </div>
  );
}
