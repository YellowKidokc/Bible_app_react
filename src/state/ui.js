import { create } from "zustand";

const defaultState = {
  layout: "single",              // "single" | "dual"
  dockSide: "right",             // "left" | "right" (where the secondary pane docks)
  leftPillar: "read",
  rightPillar: "study",
};

export const useUI = create((set, get) => ({
  ...(() => {
    const raw = localStorage.getItem("ui");
    return raw ? JSON.parse(raw) : defaultState;
  })(),
  setLayout: (layout) => set((s) => save({ ...s, layout })),
  setDockSide: (dockSide) => set((s) => save({ ...s, dockSide })),
  setLeftPillar: (leftPillar) => set((s) => save({ ...s, leftPillar })),
  setRightPillar: (rightPillar) => set((s) => save({ ...s, rightPillar })),
}));

function save(state) {
  localStorage.setItem("ui", JSON.stringify(state));
  return state;
}
