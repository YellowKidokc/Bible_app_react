import React from 'react'
import ResizablePanel from './components/ResizablePanel.jsx'
import Section from './components/Section.jsx'
import AIAssist from './components/AIAssist.jsx'
import { useSettings as useSettingsStore } from './store/settings.js'
import { getChapter, getVerseXrefs, getVerseStrongs, getVerseTimeline, getVerseResources, getVerseNotes, getBooks } from './db/queries.js'

/**
 * Enhanced Bible Reader with 3-panel layout
 * - Left: Commentaries, Cross-refs, etc. (configurable)
 * - Center: Bible text
 * - Right: AI Assistant + additional resources (configurable)
 */
export default function EnhancedReader() {
  const store = useSettingsStore()
  const { layout, sections, commentaries, ai } = store

  const [ref, setRef] = React.useState({ book: 'Genesis', abbr: 'Gen', chapter: 1, verse: null })
  const [books, setBooks] = React.useState([])
  const [verses, setVerses] = React.useState([])
  const ids = React.useMemo(() => verses.map(v => v.id), [verses])

  const [xrefs, setXrefs] = React.useState([])
  const [strongs, setStrongs] = React.useState([])
  const [periods, setPeriods] = React.useState([])
  const [notes, setNotes] = React.useState([])

  const [commMHC, setCommMHC] = React.useState([])
  const [commMac, setCommMac] = React.useState([])
  const [commGill, setCommGill] = React.useState([])
  const [media, setMedia] = React.useState([])

  // Load books and chapter
  React.useEffect(() => {
    (async () => {
      if (!books.length) {
        try {
          const list = await getBooks()
          setBooks(list)
          if (list?.length) {
            const found = list.find(b => b.abbreviation === ref.abbr) || list[0]
            setRef(r => ({ ...r, abbr: found.abbreviation, book: found.name, chapter: 1 }))
          }
        } catch (e) {
          console.warn('Failed to load books', e)
        }
      }
      const rows = await getChapter(ref.abbr, ref.chapter)
      setVerses(ref.verse ? rows.filter(r => r.n === ref.verse) : rows)
    })()
  }, [ref, books.length])

  // Load additional data
  React.useEffect(() => {
    if (!ids.length) return
    ;(async () => {
      try {
        setXrefs(await getVerseXrefs(ids))
        setPeriods(await getVerseTimeline(ids))
        if (sections.strongs !== 'hidden') setStrongs(await getVerseStrongs(ids))
        setNotes(await getVerseNotes(ids))

        // Load commentaries
        if (commentaries.mhc !== 'hidden') {
          const mhcData = await getVerseResources(ids, 'note')
          setCommMHC(mhcData.filter(r => r.provider === 'mhc'))
        }
        if (commentaries.mcarthur !== 'hidden') {
          const macData = await getVerseResources(ids, 'note')
          setCommMac(macData.filter(r => r.provider === 'mcarthur'))
        }
        if (commentaries.gill !== 'hidden') {
          const gillData = await getVerseResources(ids, 'note')
          setCommGill(gillData.filter(r => r.provider === 'gill'))
        }

        // Load media
        if (sections.media !== 'hidden') {
          const audioData = await getVerseResources(ids, 'audio')
          const videoData = await getVerseResources(ids, 'video')
          setMedia([...audioData, ...videoData])
        }
      } catch (error) {
        console.error('Error loading side data:', error)
      }
    })()
  }, [ids, sections, commentaries])

  const renderLeftPanel = () => {
    const content = layout.leftPanel.defaultContent || []

    return (
      <div className="panel-sections">
        {content.includes('commentaries') && (
          <>
            {commentaries.mhc !== 'hidden' && (
              <Section title="Commentary - Matthew Henry" defaultOpen={commentaries.mhc === 'always'}>
                <CommentaryBlock data={commMHC} />
              </Section>
            )}
            {commentaries.mcarthur !== 'hidden' && (
              <Section title="Commentary - MacArthur" defaultOpen={commentaries.mcarthur === 'always'}>
                <CommentaryBlock data={commMac} />
              </Section>
            )}
            {commentaries.gill !== 'hidden' && (
              <Section title="Commentary - Gill" defaultOpen={commentaries.gill === 'always'}>
                <CommentaryBlock data={commGill} />
              </Section>
            )}
          </>
        )}

        {content.includes('crossRefs') && sections.crossRefs !== 'hidden' && (
          <Section title="Cross-References" defaultOpen={sections.crossRefs === 'always'} count={xrefs.length}>
            <ul className="list">
              {xrefs.map((x, i) => {
                const label = `${x.dst_book || ''} ${x.dst_chapter || ''}:${x.dst_verse || ''}`.trim()
                return <li key={i}>→ {label}</li>
              })}
            </ul>
          </Section>
        )}

        {content.includes('notes') && sections.notes !== 'hidden' && (
          <Section title="Personal Notes" defaultOpen={sections.notes === 'always'} count={notes.length}>
            <ul className="list">
              {notes.map(n => <li key={n.id}><strong>{n.title || '(note)'}</strong> — {n.body_md}</li>)}
            </ul>
          </Section>
        )}
      </div>
    )
  }

  const renderCenterPanel = () => {
    return (
      <div className="center-panel">
        <div className="refbar">
          <label>Book:</label>
          <select
            value={ref.abbr}
            onChange={e => {
              const abbr = e.target.value
              const b = books.find(x => x.abbreviation === abbr)
              setRef(r => ({ ...r, abbr, book: b?.name || abbr, chapter: 1, verse: null }))
            }}
          >
            {books.map(b => (
              <option key={b.id} value={b.abbreviation}>{b.abbreviation}</option>
            ))}
          </select>
          <label>Chapter:</label>
          <input
            type="number"
            min="1"
            value={ref.chapter}
            onChange={e => setRef(r => ({ ...r, chapter: parseInt(e.target.value || '1', 10) }))}
          />
        </div>

        <div className="verses">
          {verses.map(v => (
            <div key={v.id} className="verse">
              <span className="vnum">{v.n}</span>
              <span className="vtext">{v.text}</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderRightPanel = () => {
    const content = layout.rightPanel.defaultContent || []

    return (
      <div className="panel-sections">
        {content.includes('ai') && (
          <Section title="AI Assistant" defaultOpen={true}>
            <AIAssist
              currentVerses={verses}
              verseIds={ids}
              selectedSources={[...commMHC, ...commMac, ...commGill]}
            />
          </Section>
        )}

        {content.includes('strongs') && sections.strongs !== 'hidden' && (
          <Section title="Greek/Hebrew" defaultOpen={sections.strongs === 'always'} count={strongs.length}>
            <ul className="chips">
              {strongs.map((s, i) => (
                <li key={i}>
                  <strong>{s.num}</strong> {s.lemma || ''} - {s.transliteration || ''}<br />
                  <span className="definition">{s.definition || ''}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {content.includes('timeline') && sections.timeline !== 'hidden' && (
          <Section title="Timeline" defaultOpen={sections.timeline === 'always'} count={periods.length}>
            <ul className="list">
              {periods.map((p, i) => (
                <li key={i}>
                  {p.period || p.name} {p.start_year_astro && `(${p.start_year_astro})`}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {content.includes('media') && sections.media !== 'hidden' && (
          <Section title="Media" defaultOpen={sections.media === 'always'} count={media.length}>
            <ul className="list">
              {media.map(m => {
                const src = m.local_path || m.url
                const isAudio = m.type === 'audio' || m.mime_type?.startsWith?.('audio')
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
      </div>
    )
  }

  return (
    <div className="enhanced-reader">
      {layout.leftPanel.enabled && (
        <ResizablePanel
          side="left"
          initialWidth={layout.leftPanel.width}
          collapsed={layout.leftPanel.collapsed}
          onWidthChange={(w) => store.setPanelWidth('leftPanel', w)}
          onToggleCollapse={() => store.togglePanel('leftPanel')}
          title="Study Resources"
        >
          {renderLeftPanel()}
        </ResizablePanel>
      )}

      <div className="center-panel-container">
        {renderCenterPanel()}
      </div>

      {layout.rightPanel.enabled && (
        <ResizablePanel
          side="right"
          initialWidth={layout.rightPanel.width}
          collapsed={layout.rightPanel.collapsed}
          onWidthChange={(w) => store.setPanelWidth('rightPanel', w)}
          onToggleCollapse={() => store.togglePanel('rightPanel')}
          title="AI & Resources"
        >
          {renderRightPanel()}
        </ResizablePanel>
      )}
    </div>
  )
}

function CommentaryBlock({ data = [] }) {
  if (!data.length) return <p className="muted">No commentary available for this passage.</p>
  return (
    <div className="commentary">
      {data.map(c => (
        <article key={c.id} className="card">
          <h4>{c.title}</h4>
          <p>{c.body || c.meta || 'Commentary content...'}</p>
        </article>
      ))}
    </div>
  )
}
