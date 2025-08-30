// Pretend DB calls (swap these for real SQLite later)
export async function getChapter(abbr, chapter) {
  await sleep(150)
  if (abbr==='Gen' && chapter===1) {
    return [
      { id: 1001, n: 1, text: 'In the beginning God created the heaven and the earth.' },
      { id: 1002, n: 2, text: 'And the earth was without form, and void; ...' },
    ]
  }
  return [
    { id: 2001, n: 1, text: `${abbr} ${chapter}:1 (placeholder verse)` },
    { id: 2002, n: 2, text: `${abbr} ${chapter}:2 (placeholder verse)` },
  ]
}

export async function getVerseEntities(ids){ await sleep(120); return [
  { v: ids[0], id: 'event-creation', label: 'Creation', type:'event' },
]}
export async function getVerseXrefs(ids){ await sleep(60); return [{ src: ids[0], dst: 1001 }]}
export async function getVerseStrongs(ids){ await sleep(80); return [{ v: ids[0], pos:3, num:'H7225', lemma:'reshith' }] }
export async function getVersePeriods(ids){ await sleep(50); return [{ v: ids[0], id:'period-primeval', name:'Primeval History' }] }
export async function getNotes(ids){ await sleep(90); return [{ id:'n1', subject:'verse', subject_id:String(ids[0]), authored_by:'human', title:'Sample Note', body_md:'This is a sample.' }] }
export async function getCommentary(provider, ids){ await sleep(110); return [{ id:`${provider}-1`, title:`${provider.toUpperCase()} on v${ids[0]}`, body:'Lorem ipsum commentary…' }] }
export async function getMedia(ids){ await sleep(70); return [{ id:'res1', type:'audio', title:'Sample MP3', url:'#' }] }

const sleep = (ms)=>new Promise(r=>setTimeout(r,ms))
