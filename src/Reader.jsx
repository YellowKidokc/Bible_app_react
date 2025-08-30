import React from 'react'
import Section from './components/Section.jsx'
import { useSettings } from './settings.jsx'
import { getChapter, getVerseXrefs, getVerseStrongs, getVerseTimeline, getVerseResources, getVerseNotes, getBooks } from './db/queries.js';

export default function Reader(){
  const { settings } = useSettings()
  const [ref, setRef] = React.useState({ book:'Genesis', abbr:'Gen', chapter:1, verse:null })
  const [books, setBooks] = React.useState([])
  const [verses, setVerses] = React.useState([])
  const ids = React.useMemo(()=>verses.map(v=>v.id), [verses])

  const [entities, setEntities] = React.useState([])
  const [xrefs, setXrefs] = React.useState([])
  const [strongs, setStrongs] = React.useState([])
  const [periods, setPeriods] = React.useState([])
  const [notes, setNotes] = React.useState([])

  const [commMHC, setCommMHC] = React.useState([])
  const [commMac, setCommMac] = React.useState([])
  const [commGill, setCommGill] = React.useState([])
  const [media, setMedia] = React.useState([])

  React.useEffect(()=>{
    (async ()=>{
      // Load book list once
      if (!books.length) {
        try {
          const list = await getBooks()
          setBooks(list)
          if (list?.length) {
            // If current abbr not in list, default to first book
            const found = list.find(b => b.abbreviation === ref.abbr) || list[0]
            setRef(r => ({ ...r, abbr: found.abbreviation, book: found.name, chapter: 1 }))
          }
        } catch (e) {
          console.warn('Failed to load books', e)
        }
      }
      const rows = await getChapter(ref.abbr, ref.chapter)
      setVerses(ref.verse ? rows.filter(r=>r.n===ref.verse) : rows)
    })()
  }, [ref, books.length])

  // Lazy-load side data once verses are present
  React.useEffect(()=>{
    if (!ids.length) return
    ;(async ()=>{
      try {
        setXrefs(await getVerseXrefs(ids))
        setPeriods(await getVerseTimeline(ids))
        if (settings.sections.strongs!=='hidden') setStrongs(await getVerseStrongs(ids))
        setNotes(await getVerseNotes(ids))
        
        // Commentary by provider
        if (settings.sections.commentary.mhc!=='hidden') {
          const mhcData = await getVerseResources(ids, 'note');
          setCommMHC(mhcData.filter(r => r.provider === 'mhc'));
        }
        if (settings.sections.commentary.mcarthur!=='hidden') {
          const macData = await getVerseResources(ids, 'note');
          setCommMac(macData.filter(r => r.provider === 'mcarthur'));
        }
        if (settings.sections.commentary.gill!=='hidden') {
          const gillData = await getVerseResources(ids, 'note');
          setCommGill(gillData.filter(r => r.provider === 'gill'));
        }
        
        // Media (audio/video)
        if (settings.sections.media!=='hidden') {
          const audioData = await getVerseResources(ids, 'audio');
          const videoData = await getVerseResources(ids, 'video');
          setMedia([...audioData, ...videoData]);
        }
      } catch (error) {
        console.error('Error loading side data:', error);
      }
    })()
  }, [ids, settings.sections])

  return (
    <div className="reader">
      <div className="refbar">
        <label>Book:</label>
        <select
          value={ref.abbr}
          onChange={e=>{
            const abbr = e.target.value
            const b = books.find(x=>x.abbreviation===abbr)
            setRef(r=>({ ...r, abbr, book: b?.name || abbr, chapter: 1, verse: null }))
          }}
        >
          {books.map(b => (
            <option key={b.id} value={b.abbreviation}>{b.abbreviation}</option>
          ))}
        </select>
        <label>Chapter:</label>
        <input type="number" min="1" value={ref.chapter} onChange={e=>setRef(r=>({...r, chapter:parseInt(e.target.value||'1',10)}))} />
      </div>

      {/* TEXT */}
      {settings.sections.text!=='hidden' && (
        <Section title="Text" defaultOpen={settings.sections.text==='always'}>
          <div className="verses">
            {verses.map(v=>(
              <div key={v.id} className="verse">
                <span className="vnum">{v.n}</span>
                <span className="vtext">{v.text}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* CROSS-REFS */}
      {settings.sections.xrefs!=='hidden' && (
        <Section title="Cross-References" defaultOpen={settings.sections.xrefs==='always'} count={xrefs.length}>
          <ul className="list">
            {xrefs.map((x,i)=>{
              const label = `${x.dst_book || ''} ${x.dst_chapter || ''}:${x.dst_verse || ''}`.trim()
              return <li key={i}>→ {label}</li>
            })}
          </ul>
        </Section>
      )}

      {/* COMMENTARIES (per-provider switches) */}
      {Object.entries(settings.sections.commentary).map(([provider, mode]) =>
        mode==='hidden' ? null : (
          <Section key={provider} title={`Commentary · ${provider.toUpperCase()}`} defaultOpen={mode==='always'}>
            <CommentaryBlock provider={provider} data={{
              mhc: commMHC, mcarthur: commMac, gill: commGill
            }[provider]} />
          </Section>
        )
      )}

      {/* STRONG'S */}
      {settings.sections.strongs!=='hidden' && (
        <Section title="Language (Strong's)" defaultOpen={settings.sections.strongs==='always'} count={strongs.length}>
          <ul className="chips">
            {strongs.map((s,i)=><li key={i}>v{s.v} · {s.num} {s.lemma||''}</li>)}
          </ul>
        </Section>
      )}

      {/* TIMELINE */}
      {settings.sections.timeline!=='hidden' && (
        <Section title="Timeline" defaultOpen={settings.sections.timeline==='always'} count={periods.length}>
          <ul className="list">
            {periods.map((p,i)=><li key={i}>{p.name}</li>)}
          </ul>
        </Section>
      )}

      {/* MEDIA */}
      {settings.sections.media!=='hidden' && (
        <Section title="Media" defaultOpen={settings.sections.media==='always'} count={media.length}>
          <ul className="list">
            {media.map(m=>{
              const src = m.local_path || m.url
              const isAudio = (m.type === 'audio') || (m.mime_type?.startsWith?.('audio'))
              return (
                <li key={m.id}>
                  <div className="media-item">
                    <div className="title">[{m.type}] {m.title}</div>
                    {isAudio ? (
                      <audio controls src={src} preload="none" />
                    ) : (
                      src ? <a href={src} target="_blank" rel="noreferrer">Open</a> : <span className="muted">No source</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {/* NOTES */}
      {settings.sections.notes!=='hidden' && (
        <Section title="Notes (Public/Personal)" defaultOpen={settings.sections.notes==='always'} count={notes.length}>
          <ul className="list">
            {notes.map(n=><li key={n.id}><strong>{n.title||'(note)'}</strong> — {n.body_md}</li>)}
          </ul>
        </Section>
      )}
    </div>
  )
}

function CommentaryBlock({ provider, data=[] }) {
  if (!data.length) return <p className="muted">No commentary loaded (mock).</p>
  return (
    <div className="commentary">
      {data.map(c => (
        <article key={c.id} className="card">
          <h4>{c.title}</h4>
          <p>{c.body}</p>
        </article>
      ))}
    </div>
  )
}
