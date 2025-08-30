export function ReadPage(){ return <Stub title="Read" lines={[
  "Text reader (book/chapter/verse)",
  "Bookmarks • Highlights • Audio controls",
  "Quick cross-refs inline",
]}/>; }

export function StudyPage(){ return <Stub title="Study" lines={[
  "Cross-References • Strong’s • Timelines",
  "Commentaries (provider toggles)",
  "Maps/Places",
]}/>; }

export function ResearchPage(){ return <Stub title="Research" lines={[
  "FTS search + snippets",
  "Lemma filters, date/period filters",
  "Export verse lists",
]}/>; }

export function CreatePage(){ return <Stub title="Create" lines={[
  "Markdown editor (Milkdown) with templates",
  "RAG citations • AI assistant",
  "Attachments & exports",
]}/>; }

export function MediaPage(){ return <Stub title="Media" lines={[
  "Sermons • Images • Video",
  "Filters • Licenses • Offline download",
]}/>; }

export function CommunityPage(){ return <Stub title="Community" lines={[
  "Public notes per verse",
  "Image upload (R2) • moderation",
]}/>; }

export function PrayPage(){ return <Stub title="Pray" lines={[
  "Prayer list • tags • answered",
  "Reminders & streaks",
]}/>; }

export function PlanPage(){ return <Stub title="Plan" lines={[
  "Reading plans • progress",
  "Calendar / iCal export",
]}/>; }

function Stub({ title, lines }){
  return (
    <div className="stub">
      <h2>{title}</h2>
      <ul>{lines.map((l,i)=><li key={i}>{l}</li>)}</ul>
      <p className="muted">This is a placeholder—swap in real components as we build each pillar.</p>
    </div>
  );
}
