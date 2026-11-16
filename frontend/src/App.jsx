import { useEffect, useState } from 'react'

export default function App() {
  const [apiStatus, setApiStatus] = useState('იტვირთება…')

  useEffect(() => {
    fetch('/api/health/')
      .then((response) => {
        if (!response.ok) throw new Error('API unavailable')
        return response.json()
      })
      .then((result) => setApiStatus(result.status === 'ok' ? 'კავშირი მზადაა' : 'შეზღუდული'))
      .catch(() => setApiStatus('API მიუწვდომელია'))
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-slate-900">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
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
    </main>
  )
}
