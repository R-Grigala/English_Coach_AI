import { useEffect, useState } from 'react'

export default function App() {
  const [apiStatus, setApiStatus] = useState('იტვირთება…')
  const [chatGptConnected, setChatGptConnected] = useState(false)
  const [connectionChecked, setConnectionChecked] = useState(false)
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [connectionBusy, setConnectionBusy] = useState(false)

  function closeConnectionDialog() {
    if (connectionBusy) return
    setConnectionDialogOpen(false)
    setApiKey('')
    setConnectionMessage('')
  }

  useEffect(() => {
    fetch('/api/health/')
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        return response.json()
      })
      .then((result) => setApiStatus(result.status === 'ok' ? 'კავშირი მზადაა' : 'შეზღუდული'))
      .catch(() => setApiStatus('API მიუწვდომელია'))

    fetch('/api/integrations/openai/')
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.message || 'Connection status unavailable')
        return result
      })
      .then((result) => setChatGptConnected(result.connected))
      .catch((error) => {
        setChatGptConnected(false)
        setConnectionMessage(error.message || 'კავშირის სტატუსი ვერ ჩაიტვირთა.')
      })
      .finally(() => setConnectionChecked(true))
  }, [])

  async function connectOpenAI(event) {
    event.preventDefault()
    setConnectionBusy(true)
    setConnectionMessage('')
    try {
      const response = await fetch('/api/integrations/openai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'დაკავშირება ვერ მოხერხდა.')
      setChatGptConnected(true)
      setApiKey('')
      setConnectionMessage('ChatGPT წარმატებით დაუკავშირდა.')
    } catch (error) {
      setConnectionMessage(error.message || 'დაკავშირება ვერ მოხერხდა.')
    } finally {
      setConnectionBusy(false)
    }
  }

  async function disconnectOpenAI() {
    setConnectionBusy(true)
    setConnectionMessage('')
    try {
      const response = await fetch('/api/integrations/openai/', { method: 'DELETE' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || 'კავშირის გაწყვეტა ვერ მოხერხდა.')
      setChatGptConnected(false)
      setConnectionMessage('ChatGPT-თან კავშირი გაწყდა.')
    } catch (error) {
      setConnectionMessage(error.message || 'კავშირის გაწყვეტა ვერ მოხერხდა.')
    } finally {
      setConnectionBusy(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 sm:py-12">
      <div className="mx-auto mb-6 flex max-w-5xl justify-end">
        <button
          type="button"
          onClick={() => {
            setConnectionMessage('')
            setConnectionDialogOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-indigo-300 hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          <span className={`h-2.5 w-2.5 rounded-full ${chatGptConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
          {connectionChecked && chatGptConnected ? 'ChatGPT დაკავშირებულია' : 'Connect to ChatGPT'}
        </button>
      </div>

      <section className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          შენი პირადი ინგლისურის მწვრთნელი
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
          English Coach AI
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
          ყოველდღიური პრაქტიკა, ახალი სიტყვები და გაკვეთილები შენს დონეზე.
        </p>
        <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium">
          <span className={`h-2.5 w-2.5 rounded-full ${apiStatus === 'კავშირი მზადაა' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          Backend: {apiStatus}
        </div>
      </section>

      {connectionDialogOpen && (
        <div
          className="fixed inset-0 z-10 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeConnectionDialog()
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="openai-dialog-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-indigo-600">ინტეგრაცია</p>
                <h2 id="openai-dialog-title" className="mt-1 text-2xl font-bold">
                  Connect to ChatGPT
                </h2>
              </div>
              <button
                type="button"
                aria-label="ფანჯრის დახურვა"
                onClick={closeConnectionDialog}
                className="rounded-lg px-2 py-1 text-xl text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            {chatGptConnected ? (
              <div className="mt-6">
                <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                  OpenAI API key დაკავშირებულია და backend-ზე დაშიფრულად ინახება.
                </p>
                <button
                  type="button"
                  disabled={connectionBusy}
                  onClick={disconnectOpenAI}
                  className="mt-5 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  {connectionBusy ? 'მუშავდება…' : 'კავშირის გაწყვეტა'}
                </button>
              </div>
            ) : (
              <form className="mt-6" onSubmit={connectOpenAI}>
                <label htmlFor="openai-api-key" className="block text-sm font-medium text-slate-700">
                  OpenAI API key
                </label>
                <input
                  id="openai-api-key"
                  type="password"
                  autoComplete="off"
                  spellCheck="false"
                  required
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  placeholder="sk-…"
                  className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  გასაღები ინახება მხოლოდ backend-ზე, დაშიფრული სახით. ის არ ინახება browser-ში ან localStorage-ში.
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="ml-1 font-medium text-indigo-600 hover:underline"
                  >
                    API key-ის მართვა
                  </a>
                </p>
                <button
                  type="submit"
                  disabled={connectionBusy || !apiKey.trim()}
                  className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {connectionBusy ? 'ვამოწმებ კავშირს…' : 'Connect to ChatGPT'}
                </button>
              </form>
            )}

            {connectionMessage && (
              <p role="status" className="mt-4 rounded-lg bg-slate-100 p-3 text-sm text-slate-700">
                {connectionMessage}
              </p>
            )}
          </section>
        </div>
      )}
    </main>
  )
}
