import { NavLink } from "react-router-dom";
import { useUI } from "../state/ui";

export default function TopNav() {
  const { layout, dockSide, setLayout, setDockSide, leftPillar, rightPillar, setLeftPillar, setRightPillar } = useUI();
  const tabs = ["read","study","research","create","media","community","pray","plan"];
  return (
    <div className="topnav">
      <div className="tabs">
        {tabs.map((t) => (
          <NavLink key={t} to={`/${t}`} className={({isActive}) => "tab" + (isActive ? " active" : "")}>
            {t[0].toUpperCase() + t.slice(1)}
          </NavLink>
        ))}
      </div>
      <div className="spacer" />
      <div className="controls">
        <label className="control">
          Layout:
          <select value={layout} onChange={e=>setLayout(e.target.value)}>
            <option value="single">Single</option>
            <option value="dual">Dual</option>
          </select>
        </label>
        <label className="control">
          Dock:
          <select value={dockSide} onChange={e=>setDockSide(e.target.value)}>
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
        {layout==="dual" && (
          <>
            <label className="control">Left:
              <select value={leftPillar} onChange={e=>setLeftPillar(e.target.value)}>
                <PillarOptions/>
              </select>
            </label>
            <label className="control">Right:
              <select value={rightPillar} onChange={e=>setRightPillar(e.target.value)}>
                <PillarOptions/>
              </select>
            </label>
          </>
        )}
      </div>
    </div>
  );
}

function PillarOptions(){
  const opts = ["read","study","research","create","media","community","pray","plan"];
  return opts.map(o => <option value={o} key={o}>{o}</option>);
}
