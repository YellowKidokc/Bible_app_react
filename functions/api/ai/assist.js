/**
 * AI Assistant API Endpoint
 * Supports Anthropic Claude and OpenAI GPT
 */

export async function onRequestPost({ request, env }) {
  try {
    const { prompt, verses, verseIds, sources, noteId, provider, apiKey, model } = await request.json()

    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get AI configuration from request or use defaults
    const aiProvider = provider || 'anthropic'
    const aiModel = model || (aiProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o')

    if (!apiKey) {
      return new Response(JSON.stringify({
        error: 'API key is required. Please configure your API key in Settings.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let result

    if (aiProvider === 'anthropic') {
      result = await callAnthropic(prompt, verses, sources, apiKey, aiModel)
    } else if (aiProvider === 'openai') {
      result = await callOpenAI(prompt, verses, sources, apiKey, aiModel)
    } else {
      return new Response(JSON.stringify({ error: 'Unsupported AI provider' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('AI assist error:', error)
    return new Response(JSON.stringify({
      error: error.message || 'An error occurred processing your request'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Call Anthropic Claude API
 */
async function callAnthropic(prompt, verses, sources, apiKey, model) {
  const versesContext = verses?.map(v => `Verse ${v.n}: ${v.text}`).join('\n') || ''
  const sourcesContext = sources?.map(s =>
    `${s.provider || s.title}: ${s.body || s.meta || s.label || ''}`
  ).join('\n\n') || ''

  const systemPrompt = `You are a knowledgeable Bible study assistant. You have access to:
- The current Bible passage being studied
- Various Bible commentaries and study resources
- Greek and Hebrew lexicon information
- Historical and theological context

Provide thoughtful, accurate, and helpful responses based on the biblical text and scholarly resources provided.`

  const userMessage = `${prompt}

${versesContext ? `\n\nCurrent Passage:\n${versesContext}` : ''}
${sourcesContext ? `\n\nAvailable Resources:\n${sourcesContext}` : ''}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`)
  }

  const data = await response.json()
  return data.content[0].text
}

/**
 * Call OpenAI GPT API
 */
async function callOpenAI(prompt, verses, sources, apiKey, model) {
  const versesContext = verses?.map(v => `Verse ${v.n}: ${v.text}`).join('\n') || ''
  const sourcesContext = sources?.map(s =>
    `${s.provider || s.title}: ${s.body || s.meta || s.label || ''}`
  ).join('\n\n') || ''

  const systemMessage = `You are a knowledgeable Bible study assistant. You have access to:
- The current Bible passage being studied
- Various Bible commentaries and study resources
- Greek and Hebrew lexicon information
- Historical and theological context

Provide thoughtful, accurate, and helpful responses based on the biblical text and scholarly resources provided.`

  const userMessage = `${prompt}

${versesContext ? `\n\nCurrent Passage:\n${versesContext}` : ''}
${sourcesContext ? `\n\nAvailable Resources:\n${sourcesContext}` : ''}`

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4096,
      messages: [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: userMessage
        }
      ]
    })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`)
  }

  const data = await response.json()
  return data.choices[0].message.content
}
