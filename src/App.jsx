import { Routes, Route, useLocation } from "react-router-dom";
import TopNav from "./components/TopNav.jsx";
import SplitView from "./components/SplitView.jsx";
import { useUI } from "./state/ui";
import { SettingsProvider } from './settings.jsx'
import {
  ReadPage, StudyPage, ResearchPage, CreatePage, MediaPage,
  CommunityPage, PrayPage, PlanPage
} from "./pages/_stubs.jsx";

const Pillar = {
  read: ReadPage,
  study: StudyPage,
  research: ResearchPage,
  create: CreatePage,
  media: MediaPage,
  community: CommunityPage,
  pray: PrayPage,
  plan: PlanPage,
};

export default function App(){
  const { layout, dockSide, leftPillar, rightPillar } = useUI();
  const L = Pillar[leftPillar] || ReadPage;
  const R = Pillar[rightPillar] || StudyPage;
  const location = useLocation();

  return (
    <SettingsProvider>
      <div className="app">
        <TopNav />
        <main className="main">
          {layout==="dual" ? (
            <SplitView dock={dockSide} left={<L key={`L-${leftPillar}`} />} right={<R key={`R-${rightPillar}`} />} />
          ) : (
            <Routes location={location}>
              <Route path="/" element={<ReadPage />} />
              <Route path="/read" element={<ReadPage />} />
              <Route path="/study" element={<StudyPage />} />
              <Route path="/research" element={<ResearchPage />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/media" element={<MediaPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/pray" element={<PrayPage />} />
              <Route path="/plan" element={<PlanPage />} />
            </Routes>
          )}
        </main>
      </div>
    </SettingsProvider>
  );
}
