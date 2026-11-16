import { useCallback, useEffect, useMemo, useState } from 'react'

const API = '/api'
const NAV_ITEMS = [
  { id: 'dashboard', label: 'მთავარი', icon: 'home' },
  { id: 'lessons', label: 'გაკვეთილები', icon: 'book' },
  { id: 'vocabulary', label: 'ლექსიკონი', icon: 'words' },
  { id: 'practice', label: 'გრამატიკა და Quiz', icon: 'layers' },
  { id: 'conversation', label: 'საუბრის პრაქტიკა', icon: 'chat' },
  { id: 'progress', label: 'ჩემი პროგრესი', icon: 'chart' },
]

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const result = response.status === 204 ? null : await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result?.error?.message || result?.message || 'მოთხოვნა ვერ შესრულდა. სცადე ხელახლა.')
  return result
}

function Icon({ name, size = 20, className = '' }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', className, 'aria-hidden': true }
  const shapes = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-7h6v7" /></>,
    book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 16a2.5 2.5 0 0 1 2.5-2.5H20M8 7h7" /></>,
    words: <><path d="M4 5h16M4 10h16M4 15h10M4 20h7" /><path d="m18 15 2 5 2-5" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-2 2v-6A7.5 7.5 0 1 1 20 11.5Z" /><path d="M8 11h.01M12 11h.01M16 11h.01" /></>,
    chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /><path d="M16 6h4v4" /></>,
    star: <><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" /><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    flame: <><path d="M12 22c4 0 7-3 7-7 0-3-2-5-4-7 0 3-1 4-2 4 0-5-3-8-5-10 0 4-1 6-3 9-1 1-2 3-2 5 0 3 3 6 9 6Z" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    send: <><path d="m22 2-7 20-4-9-9-4z" /><path d="M22 2 11 13" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.4.8l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.4-.8l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-1.6l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.4-.8l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.4.8l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1 0 1.6Z" transform="translate(-2 -2)" /></>,
    bookOpen: <><path d="M12 7v14M3 5a2 2 0 0 1 2-2h3a4 4 0 0 1 4 4 4 4 0 0 1 4-4h3a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2h-4a3 3 0 0 0-3 1 3 3 0 0 0-3-1H5a2 2 0 0 1-2-2z" /></>,
  }
  return <svg {...common}>{shapes[name] || shapes.spark}</svg>
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button className={`button button-${variant} ${className}`} {...props}>{children}</button>
}

function Field({ label, className = '', ...props }) {
  return <label className={`field ${className}`}><span>{label}</span><input {...props} /></label>
}

function SectionHeading({ eyebrow, title, description, action }) {
  return <div className="section-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2>{description && <p className="muted">{description}</p>}</div>{action}</div>
}

function EmptyState({ icon = 'book', title, text, action }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name={icon} size={23} /></div><h3>{title}</h3><p>{text}</p>{action}</div>
}

function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const [apiStatus, setApiStatus] = useState('loading')
  const [initialLoading, setInitialLoading] = useState(true)
  const [profile, setProfile] = useState({ display_name: '', cefr_level: 'A2', native_language: 'ka', learning_goal: '' })
  const [progress, setProgress] = useState(null)
  const [today, setToday] = useState([])
  const [weeklyPlan, setWeeklyPlan] = useState(null)
  const [lessons, setLessons] = useState([])
  const [lessonSections, setLessonSections] = useState([])
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [vocabulary, setVocabulary] = useState([])
  const [vocabularyStates, setVocabularyStates] = useState([])
  const [reviewQueue, setReviewQueue] = useState([])
  const [grammar, setGrammar] = useState([])
  const [exercises, setExercises] = useState([])
  const [progressRows, setProgressRows] = useState([])
  const [conversations, setConversations] = useState([])
  const [conversationId, setConversationId] = useState(null)
  const [conversationMessages, setConversationMessages] = useState([])
  const [connectionChecked, setConnectionChecked] = useState(false)
  const [chatGptConnected, setChatGptConnected] = useState(false)
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [connectionMessage, setConnectionMessage] = useState('')
  const [connectionBusy, setConnectionBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')
  const [lessonTopic, setLessonTopic] = useState('')
  const [vocabularyTopic, setVocabularyTopic] = useState('')
  const [vocabularyCount, setVocabularyCount] = useState(10)
  const [vocabularySearch, setVocabularySearch] = useState('')
  const [grammarTopic, setGrammarTopic] = useState('')
  const [exerciseTopic, setExerciseTopic] = useState('')
  const [exerciseCount, setExerciseCount] = useState(5)
  const [currentExercise, setCurrentExercise] = useState(null)
  const [exerciseQuestions, setExerciseQuestions] = useState([])
  const [exerciseAnswers, setExerciseAnswers] = useState({})
  const [exerciseResult, setExerciseResult] = useState(null)
  const [conversationScenario, setConversationScenario] = useState('კაფეში შეკვეთა')
  const [conversationInput, setConversationInput] = useState('')
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const showToast = useCallback((message) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3200)
  }, [])

  const refresh = useCallback(async () => {
    setError('')
    const jobs = [
      ['health', '/health/'], ['profile', '/profile/'], ['progress', '/learning/progress/summary'],
      ['today', '/learning/lessons/today'], ['week', '/learning/plans/weekly'],
      ['lessons', '/learning/lessons?per_page=50'], ['vocabulary', '/learning/vocabulary?per_page=100'],
      ['vocabularyStates', '/learning/user-vocabulary?per_page=100'],
      ['due', '/learning/vocabulary/review-queue?per_page=5'], ['grammar', '/learning/grammar-topics?per_page=50'],
      ['exercises', '/learning/exercises?per_page=50'], ['progressRows', '/learning/progress?per_page=30'],
      ['conversations', '/learning/conversations?per_page=10'],
    ]
    const results = await Promise.allSettled(jobs.map(([, path]) => request(path)))
    const values = Object.fromEntries(jobs.map(([name], index) => [name, results[index].status === 'fulfilled' ? results[index].value : null]))
    if (!values.health) {
      setApiStatus('offline')
      setError('Backend-თან კავშირი ვერ დამყარდა. გადაამოწმე Docker-ის სერვისები და სცადე განახლება.')
    } else setApiStatus(values.health.status === 'ok' ? 'online' : 'degraded')
    if (values.profile?.profile) setProfile(values.profile.profile)
    if (values.progress) setProgress(values.progress)
    if (values.today) setToday(values.today.items || [])
    if (values.week) setWeeklyPlan(values.week)
    if (values.lessons) setLessons(values.lessons.items || [])
    if (values.vocabulary) setVocabulary(values.vocabulary.items || [])
    if (values.vocabularyStates) setVocabularyStates(values.vocabularyStates.items || [])
    if (values.due) setReviewQueue(values.due.items || [])
    if (values.grammar) setGrammar(values.grammar.items || [])
    if (values.exercises) setExercises(values.exercises.items || [])
    if (values.progressRows) setProgressRows(values.progressRows.items || [])
    if (values.conversations) setConversations(values.conversations.items || [])
    setInitialLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    request('/integrations/openai/').then((result) => setChatGptConnected(Boolean(result.connected))).catch(() => setChatGptConnected(false)).finally(() => setConnectionChecked(true))
  }, [refresh])

  async function runAction(action, successMessage, after) {
    setBusy(true)
    setError('')
    try {
      const result = await action()
      if (after) await after(result)
      await refresh()
      showToast(successMessage)
      return result
    } catch (actionError) {
      setError(actionError.message || 'მოქმედება ვერ შესრულდა.')
      return null
    } finally { setBusy(false) }
  }

  async function generateLesson(event) {
    event.preventDefault()
    const result = await runAction(() => request('/ai/lessons/generate', { method: 'POST', body: { topic: lessonTopic, cefr_level: profile.cefr_level, goal: profile.learning_goal || undefined } }), 'ახალი გაკვეთილი მზად არის.')
    if (result?.lesson) { setSelectedLesson(result.lesson); setLessonSections(result.lesson.sections || []); setLessonTopic('') }
  }

  async function openLesson(lesson) {
    setSelectedLesson(lesson)
    setLessonSections([])
    try {
      const result = await request(`/learning/lesson-sections?lesson_id=${lesson.id}&per_page=50`)
      setLessonSections(result.items || [])
    } catch { setLessonSections([]) }
  }

  async function completeLesson(lesson) {
    await runAction(() => request(`/learning/lessons/${lesson.id}/complete`, { method: 'POST', body: {} }), 'გაკვეთილი დასრულებულად მოინიშნა.', async () => {
      const result = await request(`/learning/lessons/${lesson.id}`)
      setSelectedLesson(result.item)
    })
  }

  async function generateVocabulary(event) {
    event.preventDefault()
    const result = await runAction(() => request('/ai/vocabulary/generate', { method: 'POST', body: { topic: vocabularyTopic, count: Number(vocabularyCount), cefr_level: profile.cefr_level } }), 'სიტყვები დაემატა შენს ლექსიკონს.')
    if (result) setVocabularyTopic('')
  }

  async function reviewWord(item, rating) {
    const vocabularyId = item.vocabulary?.id || item.vocabulary_id
    await runAction(() => request(`/learning/vocabulary/${vocabularyId}/review`, { method: 'POST', body: { rating } }), 'გამეორება შენახულია.')
  }

  async function toggleFavorite(word) {
    const state = vocabularyStates.find((item) => item.vocabulary_id === word.id)
    const action = state
      ? request(`/learning/user-vocabulary/${state.id}`, { method: 'PUT', body: { is_favorite: !state.is_favorite } })
      : request('/learning/user-vocabulary', { method: 'POST', body: { vocabulary_id: word.id, is_favorite: true } })
    await runAction(() => action, state?.is_favorite ? 'სიტყვა Favorites-იდან ამოიშალა.' : 'სიტყვა Favorites-ში დაემატა.')
  }

  async function generateGrammar(event) {
    event.preventDefault()
    const result = await runAction(() => request('/ai/grammar/explain', { method: 'POST', body: { topic: grammarTopic, cefr_level: profile.cefr_level } }), 'გრამატიკის ახსნა შეინახა.')
    if (result) setGrammarTopic('')
  }

  async function generateExercise(event) {
    event.preventDefault()
    const result = await runAction(() => request('/ai/exercises/generate', { method: 'POST', body: { topic: exerciseTopic, count: Number(exerciseCount), cefr_level: profile.cefr_level } }), 'ახალი სავარჯიშო მზად არის.')
    if (result?.exercise) { setExerciseTopic(''); startExercise(result.exercise) }
  }

  async function startExercise(exercise) {
    setBusy(true)
    setExerciseResult(null)
    try {
      const result = await request(`/learning/exercise-questions?exercise_id=${exercise.id}&per_page=100`)
      setCurrentExercise(exercise)
      setExerciseQuestions(result.items || [])
      setExerciseAnswers({})
    } catch (actionError) { setError(actionError.message || 'სავარჯიშო ვერ ჩაიტვირთა.') }
    finally { setBusy(false) }
  }

  async function submitExercise(event) {
    event.preventDefault()
    if (!currentExercise || Object.keys(exerciseAnswers).length !== exerciseQuestions.length) return
    await runAction(() => request(`/learning/exercises/${currentExercise.id}/submit`, { method: 'POST', body: { answers: exerciseAnswers } }), 'პასუხები შეფასდა.', (result) => setExerciseResult(result.attempt))
  }

  async function loadConversation(id) {
    setConversationId(id)
    try {
      const result = await request(`/learning/conversation-messages?conversation_id=${id}&per_page=100`)
      setConversationMessages((result.items || []).slice().reverse())
    } catch (actionError) { setError(actionError.message || 'საუბარი ვერ ჩაიტვირთა.') }
  }

  async function sendConversationMessage(event) {
    event?.preventDefault()
    const message = conversationInput.trim()
    if (!message || busy) return
    setBusy(true)
    setError('')
    try {
      let result
      if (!conversationId) {
        result = await request('/ai/conversations', { method: 'POST', body: { scenario: conversationScenario, message, cefr_level: profile.cefr_level } })
        setConversationId(result.conversation.id)
        setConversationMessages([
          { role: 'user', content: result.user_message },
          { role: 'assistant', content: result.assistant_message.content, feedback: result.assistant_message.feedback },
        ])
      } else {
        result = await request(`/ai/conversations/${conversationId}/messages`, { method: 'POST', body: { message } })
        setConversationMessages((items) => [...items, { role: 'user', content: result.user_message }, { role: 'assistant', content: result.assistant_message.content, feedback: result.assistant_message.feedback }])
      }
      setConversationInput('')
      await refresh()
    } catch (actionError) { setError(actionError.message || 'პასუხის მიღება ვერ მოხერხდა.') }
    finally { setBusy(false) }
  }

  async function saveProfile(event) {
    event.preventDefault()
    await runAction(() => request('/profile/', { method: 'PUT', body: profile }), 'პროფილი განახლდა.', async (result) => {
      if (result?.profile) setProfile(result.profile)
      setProfileDialogOpen(false)
    })
  }

  async function connectOpenAI(event) {
    event.preventDefault(); setConnectionBusy(true); setConnectionMessage('')
    try {
      await request('/integrations/openai/', { method: 'POST', body: { api_key: apiKey } })
      setChatGptConnected(true); setApiKey(''); setConnectionMessage('OpenAI API წარმატებით დაუკავშირდა.')
    } catch (actionError) { setConnectionMessage(actionError.message || 'დაკავშირება ვერ მოხერხდა.') }
    finally { setConnectionBusy(false) }
  }

  async function disconnectOpenAI() {
    setConnectionBusy(true); setConnectionMessage('')
    try { await request('/integrations/openai/', { method: 'DELETE' }); setChatGptConnected(false); setConnectionMessage('OpenAI API-ს კავშირი გაითიშა.') }
    catch (actionError) { setConnectionMessage(actionError.message || 'კავშირის გაწყვეტა ვერ მოხერხდა.') }
    finally { setConnectionBusy(false) }
  }

  const filteredVocabulary = useMemo(() => {
    const query = vocabularySearch.trim().toLocaleLowerCase()
    return query ? vocabulary.filter((item) => `${item.word} ${item.translation}`.toLocaleLowerCase().includes(query)) : vocabulary
  }, [vocabulary, vocabularySearch])

  const activeNav = NAV_ITEMS.find((item) => item.id === activePage) || NAV_ITEMS[0]
  const welcomeName = profile.display_name?.trim() || 'მეგობარო'
  const firstName = welcomeName.split(/\s+/)[0]

  function navigate(page) { setActivePage(page); setMobileNavOpen(false); setError('') }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#dashboard" onClick={() => navigate('dashboard')}>
          <span className="brand-mark"><Icon name="spark" size={21} /></span>
          <span><strong>English Coach</strong><small>პირადი ინგლისურის მწვრთნელი</small></span>
        </a>
        <div className="nav-caption">სასწავლო სივრცე</div>
        <nav className="side-nav" aria-label="მთავარი ნავიგაცია">
          {NAV_ITEMS.map((item) => <button key={item.id} className={`nav-item ${activePage === item.id ? 'nav-active' : ''}`} onClick={() => navigate(item.id)}><Icon name={item.icon} size={19} /><span>{item.label}</span>{item.id === 'vocabulary' && reviewQueue.length > 0 && <span className="nav-badge">{reviewQueue.length}</span>}</button>)}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-tip"><div className="tip-icon"><Icon name="target" size={18} /></div><strong>პატარა ნაბიჯები</strong><p>დღეში 15 წუთიც საკმარისია პროგრესისთვის.</p><button onClick={() => navigate('progress')}>ჩემი პროგრესი <Icon name="arrow" size={14} /></button></div>
          <button className="profile-mini" onClick={() => setProfileDialogOpen(true)}><span className="avatar">{firstName.charAt(0).toUpperCase()}</span><span><strong>{welcomeName}</strong><small>{profile.cefr_level} · English learner</small></span><Icon name="settings" size={17} /></button>
        </div>
      </aside>

      {mobileNavOpen && <button className="mobile-scrim" aria-label="მენიუს დახურვა" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left"><button className="mobile-menu" aria-label="მენიუს გახსნა" onClick={() => setMobileNavOpen(true)}>☰</button><div className="breadcrumbs"><span>სასწავლო სივრცე</span><b>/</b><strong>{activeNav.label}</strong></div></div>
          <div className="topbar-actions"><span className={`service-status ${apiStatus}`}><i />{apiStatus === 'online' ? 'სისტემა მზადაა' : apiStatus === 'loading' ? 'იტვირთება' : 'კავშირი შეზღუდულია'}</span><button className={`connection-chip ${chatGptConnected ? 'is-connected' : ''}`} onClick={() => { setConnectionMessage(''); setConnectionDialogOpen(true) }}><span className="connection-dot" />{connectionChecked && chatGptConnected ? 'AI დაკავშირებულია' : 'Connect to ChatGPT'}</button></div>
        </header>

        <div className="page-content">
          {initialLoading ? <PageSkeleton /> : <>
          {error && <div className="alert alert-error" role="alert"><span>{error}</span><button aria-label="დახურვა" onClick={() => setError('')}><Icon name="close" size={16} /></button></div>}
          {apiStatus === 'offline' && <div className="offline-banner"><span>Backend მიუწვდომელია. გვერდზე არსებული მონაცემები შესაძლოა განახლებული არ იყოს.</span><Button variant="secondary" onClick={refresh}>ხელახლა ცდა</Button></div>}
          {activePage === 'dashboard' && <DashboardPage {...{ profile, progress, today, weeklyPlan, lessons, reviewQueue, busy, navigate, setProfileDialogOpen, openLesson, reviewWord, showToast }} />}
          {activePage === 'lessons' && <LessonsPage {...{ lessons, selectedLesson, lessonSections, lessonTopic, setLessonTopic, generateLesson, openLesson, completeLesson, busy, navigate, setSelectedLesson, setLessonSections }} />}
          {activePage === 'vocabulary' && <VocabularyPage {...{ filteredVocabulary, vocabularyTopic, setVocabularyTopic, vocabularyCount, setVocabularyCount, generateVocabulary, vocabularySearch, setVocabularySearch, reviewQueue, reviewWord, busy, vocabularyStates, toggleFavorite }} />}
          {activePage === 'practice' && <PracticePage {...{ grammar, exercises, grammarTopic, setGrammarTopic, generateGrammar, exerciseTopic, setExerciseTopic, exerciseCount, setExerciseCount, generateExercise, busy, startExercise, currentExercise, exerciseQuestions, exerciseAnswers, setExerciseAnswers, submitExercise, exerciseResult, setCurrentExercise }} />}
          {activePage === 'conversation' && <ConversationPage {...{ conversations, conversationId, conversationMessages, conversationScenario, setConversationScenario, conversationInput, setConversationInput, sendConversationMessage, loadConversation, busy, profile, resetConversation: () => { setConversationId(null); setConversationMessages([]); setError('') } }} />}
          {activePage === 'progress' && <ProgressPage {...{ progress, progressRows, lessons, vocabulary, reviewQueue, navigate }} />}
          </>}
        </div>
      </main>

      {connectionDialogOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !connectionBusy) { setConnectionDialogOpen(false); setApiKey(''); setConnectionMessage('') } }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="connection-title"><div className="modal-heading"><div><span className="modal-icon"><Icon name="spark" /></span><div><p className="eyebrow">ინტეგრაცია</p><h2 id="connection-title">Connect to ChatGPT</h2></div></div><button className="icon-button" aria-label="დახურვა" onClick={() => { if (!connectionBusy) { setConnectionDialogOpen(false); setApiKey(''); setConnectionMessage('') } }}><Icon name="close" /></button></div>
        {chatGptConnected ? <div className="connection-success"><div className="success-check"><Icon name="check" /></div><div><strong>OpenAI API დაკავშირებულია</strong><p>გასაღები backend-ზე დაშიფრულად ინახება.</p></div><Button variant="danger" disabled={connectionBusy} onClick={disconnectOpenAI}>{connectionBusy ? 'მუშავდება…' : 'გათიშვა'}</Button></div> : <form onSubmit={connectOpenAI}><label className="field"><span>OpenAI API key</span><input type="password" autoComplete="off" spellCheck="false" required value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-…" /></label><p className="form-hint">გასაღები ინახება დაშიფრული სახით მხოლოდ backend-ზე და არ ინახება browser-ში.<a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer"> API key-ის მართვა</a></p><Button type="submit" disabled={connectionBusy || !apiKey.trim()} className="full-button">{connectionBusy ? 'ვამოწმებ კავშირს…' : 'დაკავშირება'}</Button></form>}
        {connectionMessage && <p className="inline-feedback" role="status">{connectionMessage}</p>}</section></div>}

      {profileDialogOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setProfileDialogOpen(false) }}><section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="profile-title"><div className="modal-heading"><div><span className="modal-icon"><Icon name="target" /></span><div><p className="eyebrow">პერსონალიზაცია</p><h2 id="profile-title">შენი სასწავლო პროფილი</h2></div></div><button className="icon-button" aria-label="დახურვა" onClick={() => setProfileDialogOpen(false)}><Icon name="close" /></button></div><form onSubmit={saveProfile} className="form-stack"><Field label="სახელი" value={profile.display_name || ''} onChange={(event) => setProfile({ ...profile, display_name: event.target.value })} placeholder="როგორ მოგმართო?" /><label className="field"><span>ინგლისურის დონე</span><select value={profile.cefr_level || 'A2'} onChange={(event) => setProfile({ ...profile, cefr_level: event.target.value })}>{['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => <option key={level}>{level}</option>)}</select></label><label className="field"><span>შენი მიზანი</span><textarea rows="3" maxLength="500" value={profile.learning_goal || ''} onChange={(event) => setProfile({ ...profile, learning_goal: event.target.value })} placeholder="მაგ. ინგლისური სამსახურისთვის გავაუმჯობესო" /></label><Button type="submit" disabled={busy} className="full-button">{busy ? 'ინახება…' : 'ცვლილებების შენახვა'}</Button></form></section></div>}

      {toast && <div className="toast" role="status"><span className="toast-check"><Icon name="check" size={16} /></span>{toast}</div>}
    </div>
  )
}

function DashboardPage({ profile, progress, today, weeklyPlan, lessons, reviewQueue, busy, navigate, setProfileDialogOpen, openLesson, reviewWord }) {
  const nextLesson = today[0] || weeklyPlan?.items?.find((item) => item.status !== 'completed')
  const completedCount = lessons.filter((lesson) => lesson.status === 'completed').length
  return <div className="dashboard-page">
    <section className="welcome-row"><div><p className="eyebrow">{new Intl.DateTimeFormat('ka-GE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p><h1>გამარჯობა, {profile.display_name?.trim()?.split(/\s+/)[0] || 'მეგობარო'} <span className="wave">✦</span></h1><p className="muted">დღესაც ერთი ნაბიჯით მიუახლოვდი შენს მიზანს.</p></div><button className="level-pill" onClick={() => setProfileDialogOpen(true)}><span className="level-icon"><Icon name="target" size={18} /></span><span><small>შენი დონე</small><strong>{profile.cefr_level || 'A2'} · English</strong></span><Icon name="arrow" size={15} /></button></section>

    <section className="hero-card"><div className="hero-copy"><div className="hero-kicker"><span><Icon name="spark" size={15} /></span>დღიური პროგრესი</div><h2>ინგლისური ყოველდღე,<br /><em>შენი ტემპით.</em></h2><p>მოკლე გაკვეთილები და პრაქტიკა, რომელიც შენს დონესა და მიზანს ერგება.</p><Button onClick={() => nextLesson ? (navigate('lessons'), openLesson(nextLesson)) : navigate('lessons')}>{nextLesson ? 'გაკვეთილის გაგრძელება' : 'გაკვეთილის დაწყება'} <Icon name="arrow" size={17} /></Button><div className="hero-footnote"><Icon name="clock" size={15} /> ყოველდღე 15 წუთი საკმარისია</div></div><div className="hero-art" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="book-illustration"><span className="book-shadow" /><div className="book-page book-page-left"><i /><i /><i /><b>hello!</b></div><div className="book-page book-page-right"><span>EN</span><i /><i /><i /></div><span className="book-spark">✦</span></div><div className="art-note note-top"><span className="note-dot" /> daily practice</div><div className="art-note note-bottom">✧ &nbsp; little by little</div></div></section>

    <section className="stat-grid"><StatCard icon="flame" label="აქტიური დღეები" value={progress?.daily_streak ?? '—'} suffix="დღე" tone="peach" caption="შეინარჩუნე კარგი ტემპი" /><StatCard icon="words" label="ახალი სიტყვები" value={progress?.last_7_days?.words_learned ?? 0} suffix="სიტყვა" tone="lavender" caption="ბოლო 7 დღეში" /><StatCard icon="clock" label="სწავლის დრო" value={Math.round((progress?.last_7_days?.duration_seconds || 0) / 60)} suffix="წთ" tone="mint" caption="ბოლო 7 დღეში" /><StatCard icon="book" label="დასრულებული გაკვეთილი" value={completedCount} suffix="გაკვეთილი" tone="blue" caption="შენი სასწავლო ბიბლიოთეკა" /></section>

    <div className="dashboard-columns"><section className="panel weekly-panel"><div className="panel-heading"><div><p className="eyebrow">ამ კვირაში</p><h2>შენი სასწავლო გეგმა</h2></div><button className="text-link" onClick={() => navigate('lessons')}>ყველა გაკვეთილი <Icon name="arrow" size={15} /></button></div>{weeklyPlan?.items?.length ? <div className="week-list">{weeklyPlan.items.slice(0, 4).map((item, index) => <button className="week-item" key={item.id} onClick={() => { navigate('lessons'); openLesson(item) }}><span className={`week-index ${item.status === 'completed' ? 'week-done' : ''}`}>{item.status === 'completed' ? <Icon name="check" size={16} /> : `0${index + 1}`}</span><span className="week-copy"><strong>{item.title}</strong><small>{item.scheduled_for || item.status || 'დაგეგმილი გაკვეთილი'}</small></span><Icon name="arrow" size={16} className="week-arrow" /></button>)}</div> : <EmptyState icon="bookOpen" title="კვირის გეგმა ჯერ არ გაქვს" text="შექმენი პირველი გაკვეთილი და აქ გამოჩნდება შენი სასწავლო გზა." action={<Button variant="quiet" onClick={() => navigate('lessons')}>გაკვეთილის შექმნა <Icon name="arrow" size={15} /></Button>} />}</section>

      <section className="panel review-panel"><div className="panel-heading"><div><p className="eyebrow">სივრცული გამეორება</p><h2>სიტყვების დრო</h2></div><span className="count-chip">{reviewQueue.length} დარჩა</span></div>{reviewQueue.length ? <><p className="review-intro">გაიხსენე სიტყვა და შეაფასე, რამდენად მარტივი იყო.</p><div className="review-word"><span className="review-word-main">{reviewQueue[0].vocabulary?.word || 'სიტყვა'}</span><span className="review-translation">{reviewQueue[0].vocabulary?.translation || 'თარგმანი'}</span>{reviewQueue[0].vocabulary?.examples?.[0] && <p className="review-example">“{reviewQueue[0].vocabulary.examples[0]}”</p>}</div><div className="rating-row">{[0, 1, 2, 3, 4, 5].map((rating) => <button key={rating} title={`შეფასება ${rating}`} disabled={busy} onClick={() => reviewWord(reviewQueue[0], rating)}>{rating}</button>)}</div><div className="rating-caption"><span>ვერ გავიხსენე</span><span>მარტივი იყო</span></div></> : <EmptyState icon="words" title="დღეს ყველაფერი გამეორებულია" text="ახალი სიტყვები დაამატე, რომ შენი ლექსიკონი გაიზარდოს." action={<Button variant="quiet" onClick={() => navigate('vocabulary')}>ლექსიკონში გადასვლა <Icon name="arrow" size={15} /></Button>} />}</section></div>

    <section className="bottom-callout"><div className="callout-icon"><Icon name="spark" /></div><div><strong>გრამატიკა, үгс ба საუბარი — ყველაფერი ერთ სივრცეში</strong><p>აირჩიე პატარა დავალება და ივარჯიშე საკუთარ ტემპში.</p></div><Button variant="secondary" onClick={() => navigate('practice')}>პრაქტიკის ნახვა <Icon name="arrow" size={15} /></Button></section>
  </div>
}

function StatCard({ icon, label, value, suffix, tone, caption }) {
  return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon name={icon} size={19} /></div><span className="stat-label">{label}</span><div className="stat-value">{value}<small>{suffix}</small></div><span className="stat-caption">{caption}</span></article>
}

function PageSkeleton() {
  return <div className="page-skeleton" aria-label="იტვირთება" aria-busy="true"><div className="skeleton-heading"><span /><b /><i /></div><div className="skeleton-hero"><span /><div><b /><i /><i /><span /></div></div><div className="skeleton-stats">{[1, 2, 3, 4].map((item) => <span key={item} />)}</div><div className="skeleton-panels"><span /><span /></div></div>
}

function LessonsPage({ lessons, selectedLesson, lessonSections, lessonTopic, setLessonTopic, generateLesson, openLesson, completeLesson, busy, navigate, setSelectedLesson, setLessonSections }) {
  return <div className="content-page"><SectionHeading eyebrow="სასწავლო ბიბლიოთეკა" title="გაკვეთილები" description="შექმენი შენს დონეზე მორგებული გაკვეთილი და ისწავლე ნაწილ-ნაწილ." action={<span className="soft-count">{lessons.length} გაკვეთილი</span>} />
    <section className="generator-panel lesson-generator"><div className="generator-decoration"><span className="generator-star">✦</span><span className="generator-orbit" /></div><div className="generator-copy"><span className="generator-label"><Icon name="spark" size={14} /> AI გაკვეთილის გენერატორი</span><h3>რა თემაზე გინდა დღეს ისწავლო?</h3><p>გაკვეთილი მოერგება შენს {lessons[0]?.cefr_level || 'პირად'} დონეს და სასწავლო მიზანს.</p><form className="inline-form" onSubmit={generateLesson}><input required maxLength="120" value={lessonTopic} onChange={(event) => setLessonTopic(event.target.value)} placeholder="მაგ. მოგზაურობა, სამსახურის ინგლისური…" /><Button disabled={busy || !lessonTopic.trim()}>{busy ? 'იქმნება…' : 'გაკვეთილის შექმნა'} <Icon name="arrow" size={16} /></Button></form></div></section>
    {selectedLesson && <section className="lesson-detail panel"><div className="detail-top"><div><span className="status-label"><span className="status-dot" />{selectedLesson.status === 'completed' ? 'დასრულებულია' : 'შენი გაკვეთილი'}</span><h2>{selectedLesson.title}</h2><p>{selectedLesson.description}</p></div><button className="icon-button" aria-label="დეტალის დახურვა" onClick={() => { setSelectedLesson(null); setLessonSections([]) }}><Icon name="close" size={17} /></button></div><div className="lesson-sections">{lessonSections.map((section, index) => <article className="lesson-section" key={section.id || `${section.title}-${index}`}><div className="lesson-section-number">{String(index + 1).padStart(2, '0')}</div><div><span className="eyebrow">{section.section_type || 'გაკვეთილი'}</span><h3>{section.title}</h3><p>{section.content?.body || section.content}</p>{section.content?.examples?.length > 0 && <div className="example-list">{section.content.examples.map((example, i) => <p key={i}>“{example}”</p>)}</div>}{section.content?.key_points?.length > 0 && <ul>{section.content.key_points.map((point, i) => <li key={i}>{point}</li>)}</ul>}</div></article>)}</div>{selectedLesson.status !== 'completed' && <Button onClick={() => completeLesson(selectedLesson)} disabled={busy}><Icon name="check" size={17} /> გაკვეთილის დასრულება</Button>}</section>}
    <div className="list-heading"><h2>შენი გაკვეთილები</h2><span>{lessons.length} სულ</span></div>{lessons.length ? <div className="lesson-grid">{lessons.map((lesson, index) => <button className={`lesson-card ${selectedLesson?.id === lesson.id ? 'lesson-selected' : ''}`} key={lesson.id} onClick={() => openLesson(lesson)}><div className={`lesson-card-art art-${index % 4}`}><span>{lesson.cefr_level || 'A2'}</span><Icon name={index % 2 ? 'book' : 'spark'} size={27} /></div><div className="lesson-card-body"><span className="eyebrow">{lesson.topic || 'English lesson'} · {lesson.status === 'completed' ? 'დასრულებული' : 'გასაგრძელებელი'}</span><h3>{lesson.title}</h3><p>{lesson.description || 'გახსენი და გააგრძელე სწავლა.'}</p><span className="lesson-card-link">გაკვეთილის გახსნა <Icon name="arrow" size={15} /></span></div></button>)}</div> : <EmptyState title="გაკვეთილები ჯერ არ გაქვს" text="AI გენერატორით შექმენი პირველი შენზე მორგებული გაკვეთილი." action={<Button variant="quiet" onClick={() => document.querySelector('.lesson-generator input')?.focus()}>დაწყება <Icon name="arrow" size={15} /></Button>} />}
  </div>
}

function VocabularyPage({ filteredVocabulary, vocabularyTopic, setVocabularyTopic, vocabularyCount, setVocabularyCount, generateVocabulary, vocabularySearch, setVocabularySearch, reviewQueue, reviewWord, busy, vocabularyStates, toggleFavorite }) {
  return <div className="content-page"><SectionHeading eyebrow="პირადი ლექსიკონი" title="სიტყვები, რომლებიც შენთან რჩება" description="შეაგროვე ახალი სიტყვები, ნახე მაგალითები და გაიმეორე სწორი ინტერვალებით." action={<span className="soft-count">{filteredVocabulary.length} სიტყვა</span>} />
    <section className="generator-panel vocabulary-generator"><div className="generator-decoration vocabulary-art"><span className="floating-letter">A</span><span className="floating-letter">ბ</span><span className="floating-letter">C</span></div><div className="generator-copy"><span className="generator-label"><Icon name="spark" size={14} /> AI Vocabulary Builder</span><h3>დაამატე სიტყვები თემის მიხედვით</h3><p>ინგლისური სიტყვები ქართული თარგმანით, წარმოთქმითა და მაგალითებით.</p><form className="inline-form vocab-form" onSubmit={generateVocabulary}><input required maxLength="120" value={vocabularyTopic} onChange={(event) => setVocabularyTopic(event.target.value)} placeholder="მაგ. სამსახური, მოგზაურობა, ყოველდღიური საუბარი…" /><select aria-label="სიტყვების რაოდენობა" value={vocabularyCount} onChange={(event) => setVocabularyCount(event.target.value)}>{[5, 10, 15, 20].map((count) => <option key={count} value={count}>{count} სიტყვა</option>)}</select><Button disabled={busy || !vocabularyTopic.trim()}>{busy ? 'იქმნება…' : 'სიტყვების შექმნა'} <Icon name="arrow" size={16} /></Button></form></div></section>
    <div className="vocabulary-toolbar"><div className="search-box"><Icon name="search" size={18} /><input value={vocabularySearch} onChange={(event) => setVocabularySearch(event.target.value)} placeholder="მოძებნე სიტყვა ან თარგმანი" /></div><span className="muted small">შენახულია {filteredVocabulary.length} სიტყვა</span></div>
    <div className="vocabulary-layout"><section className="vocabulary-list">{filteredVocabulary.length ? filteredVocabulary.map((word, index) => { const savedState = vocabularyStates.find((item) => item.vocabulary_id === word.id); return <article className="vocab-row" key={word.id}><span className={`vocab-letter letter-${index % 5}`}>{word.word?.charAt(0)?.toUpperCase()}</span><div className="vocab-main"><div className="vocab-word-line"><h3>{word.word}</h3><span className="part-label">{word.part_of_speech || 'word'}</span><span className="cefr-tag">{word.cefr_level}</span></div><p className="vocab-pronunciation">{word.pronunciation ? `/${word.pronunciation}/` : ''}</p><p className="vocab-translation">{word.translation}</p>{word.examples?.[0] && <p className="vocab-example">“{word.examples[0]}”</p>}</div><button className={`favorite-button ${savedState?.is_favorite ? 'favorite-active' : ''}`} title={savedState?.is_favorite ? 'Favorites-იდან წაშლა' : 'Favorites-ში დამატება'} aria-label={savedState?.is_favorite ? 'Favorites-იდან წაშლა' : 'Favorites-ში დამატება'} onClick={() => toggleFavorite(word)}><Icon name="star" size={17} /></button></article>}) : <EmptyState icon="words" title={vocabularySearch ? 'შედეგი ვერ მოიძებნა' : 'ლექსიკონი ცარიელია'} text={vocabularySearch ? 'შეცვალე საძიებო სიტყვა.' : 'თემის მიხედვით შექმენი პირველი სიტყვების ნაკრები.'} />}</section>
      <aside className="review-side panel"><span className="eyebrow">დღევანდელი გამეორება</span><div className="review-count-large">{reviewQueue.length}<small>სიტყვა</small></div>{reviewQueue.length ? <><p className="muted">{reviewQueue[0].vocabulary?.word} · {reviewQueue[0].vocabulary?.translation}</p><div className="rating-row">{[0, 1, 2, 3, 4, 5].map((rating) => <button key={rating} disabled={busy} onClick={() => reviewWord(reviewQueue[0], rating)}>{rating}</button>)}</div><div className="rating-caption"><span>რთული</span><span>მარტივი</span></div></> : <p className="muted">გამეორება დაგეგმილი არ არის. ახალი სიტყვები დაამატე და დაიწყე ვარჯიში.</p>}<div className="review-progress"><span style={{ width: reviewQueue.length ? `${Math.max(12, 100 - reviewQueue.length * 12)}%` : '100%' }} /></div></aside></div>
  </div>
}

function PracticePage({ grammar, exercises, grammarTopic, setGrammarTopic, generateGrammar, exerciseTopic, setExerciseTopic, exerciseCount, setExerciseCount, generateExercise, busy, startExercise, currentExercise, exerciseQuestions, exerciseAnswers, setExerciseAnswers, submitExercise, exerciseResult, setCurrentExercise }) {
  return <div className="content-page"><SectionHeading eyebrow="აქტიური სწავლა" title="გრამატიკა და პრაქტიკა" description="გაიგე წესები მაგალითებით და შეამოწმე ცოდნა მოკლე Quiz-ებით." />
    <div className="practice-tools"><section className="practice-generator panel"><div className="practice-card-icon grammar-icon"><Icon name="bookOpen" size={21} /></div><span className="generator-label"><Icon name="spark" size={14} /> Grammar Assistant</span><h3>რომელი წესის ახსნა გინდა?</h3><p>რთული წესი მარტივი ქართული ახსნითა და ინგლისური მაგალითებით.</p><form onSubmit={generateGrammar} className="form-stack"><input required maxLength="160" value={grammarTopic} onChange={(event) => setGrammarTopic(event.target.value)} placeholder="მაგ. Present Perfect" /><Button disabled={busy || !grammarTopic.trim()}>{busy ? 'მზადდება…' : 'ახსნის მიღება'} <Icon name="arrow" size={15} /></Button></form></section>
      <section className="practice-generator panel exercise-generator"><div className="practice-card-icon exercise-icon"><Icon name="layers" size={21} /></div><span className="generator-label"><Icon name="spark" size={14} /> Quiz Generator</span><h3>შექმენი სავარჯიშო</h3><p>აირჩიე თემა და ივარჯიშე მრავალვარიანტიან კითხვებზე.</p><form onSubmit={generateExercise} className="form-stack"><input required maxLength="160" value={exerciseTopic} onChange={(event) => setExerciseTopic(event.target.value)} placeholder="მაგ. Past Simple კითხვები" /><div className="inline-controls"><select aria-label="კითხვების რაოდენობა" value={exerciseCount} onChange={(event) => setExerciseCount(event.target.value)}>{[3, 5, 8, 10].map((count) => <option key={count}>{count}</option>)}</select><Button disabled={busy || !exerciseTopic.trim()}>{busy ? 'იქმნება…' : 'Quiz-ის შექმნა'} <Icon name="arrow" size={15} /></Button></div></form></section></div>
    <div className="practice-columns"><section className="panel grammar-list"><div className="panel-heading"><div><p className="eyebrow">შენი ბიბლიოთეკა</p><h2>გრამატიკის თემები</h2></div><span className="soft-count">{grammar.length}</span></div>{grammar.length ? grammar.map((item) => <article className="grammar-item" key={item.id}><span className="grammar-item-icon"><Icon name="book" size={17} /></span><div><h3>{item.title}</h3><p>{item.cefr_level} · {item.explanation}</p><div className="grammar-examples">{(item.examples || []).slice(0, 2).map((example, index) => <span key={index}>{example}</span>)}</div></div></article>) : <EmptyState icon="bookOpen" title="თემები ჯერ არ გაქვს" text="შექმენი პირველი ახსნა ზემოთ." />}</section>
      <section className="panel exercise-list"><div className="panel-heading"><div><p className="eyebrow">შეამოწმე ცოდნა</p><h2>შენი სავარჯიშოები</h2></div><span className="soft-count">{exercises.length}</span></div>{exercises.length ? exercises.map((item) => <button className={`exercise-item ${currentExercise?.id === item.id ? 'exercise-active' : ''}`} key={item.id} onClick={() => startExercise(item)}><span className="exercise-number"><Icon name="layers" size={17} /></span><span><strong>{item.title}</strong><small>{item.cefr_level} · {item.exercise_type?.replace('_', ' ')}</small></span><Icon name="arrow" size={16} /></button>) : <EmptyState icon="target" title="სავარჯიშო ჯერ არ გაქვს" text="AI-ით შექმენი პირველი Quiz." />}</section></div>
    {currentExercise && <section className="exercise-workspace panel"><div className="panel-heading"><div><p className="eyebrow">სავარჯიშო</p><h2>{currentExercise.title}</h2><p className="muted">{currentExercise.instructions}</p></div><button className="icon-button" onClick={() => { setCurrentExercise(null) }} aria-label="სავარჯიშოს დახურვა"><Icon name="close" /></button></div>{exerciseResult ? <><div className="result-card"><div className="result-score">{exerciseResult.percentage}<small>%</small></div><div><h3>{exerciseResult.percentage >= 70 ? 'კარგი შედეგია!' : 'კიდევ ერთხელ სცადე'}</h3><p>{exerciseResult.score} სწორი პასუხი {exerciseResult.max_score}-დან</p></div></div><div className="answer-feedback-list">{exerciseResult.feedback?.questions?.map((item, index) => <article className={`answer-feedback ${item.is_correct ? 'answer-correct' : 'answer-incorrect'}`} key={item.question_id}><strong>{item.is_correct ? 'სწორია' : 'გასამეორებელია'} · კითხვა {index + 1}</strong><p>{item.explanation}</p>{!item.is_correct && <small>სწორი პასუხი: {item.correct_answer}</small>}</article>)}</div></> : <form onSubmit={submitExercise}><div className="question-list">{exerciseQuestions.map((question, index) => <fieldset className="question-card" key={question.id}><legend><span>{String(index + 1).padStart(2, '0')}</span>{question.prompt}</legend><div className="options-grid">{(question.options || []).map((option) => <label className={`option-choice ${exerciseAnswers[question.id] === option ? 'option-selected' : ''}`} key={option}><input type="radio" name={`question-${question.id}`} value={option} checked={exerciseAnswers[question.id] === option} onChange={() => setExerciseAnswers({ ...exerciseAnswers, [question.id]: option })} /><span className="radio-mark" />{option}</label>)}</div></fieldset>)}</div><Button disabled={busy || Object.keys(exerciseAnswers).length !== exerciseQuestions.length}>{busy ? 'იგზავნება…' : 'პასუხების შემოწმება'} <Icon name="arrow" size={16} /></Button></form>}</section>}
  </div>
}

function ConversationPage({ conversations, conversationId, conversationMessages, conversationScenario, setConversationScenario, conversationInput, setConversationInput, sendConversationMessage, loadConversation, busy, profile, resetConversation }) {
  return <div className="content-page conversation-page"><SectionHeading eyebrow="Speaking practice · ტექსტური რეჟიმი" title="ივარჯიშე საუბარში" description={`ესაუბრე AI მწვრთნელს რეალურ სიტუაციებზე. დონე: ${profile.cefr_level || 'A2'} · შესწორებები ქართულად.`} />
    <div className="conversation-layout"><aside className="conversation-sidebar panel"><Button className="full-button" onClick={resetConversation}><Icon name="plus" size={17} /> ახალი საუბარი</Button><p className="eyebrow conversation-side-title">ბოლო საუბრები</p>{conversations.length ? conversations.map((conversation) => <button key={conversation.id} className={`conversation-history ${conversationId === conversation.id ? 'history-active' : ''}`} onClick={() => loadConversation(conversation.id)}><span className="history-icon"><Icon name="chat" size={16} /></span><span><strong>{conversation.title || conversation.scenario || 'English practice'}</strong><small>{conversation.cefr_level} · {conversation.status}</small></span></button>) : <p className="muted small">საუბრები ჯერ არ გაქვს.</p>}<div className="scenario-box"><label className="field"><span>სცენარი</span><select value={conversationScenario} onChange={(event) => setConversationScenario(event.target.value)}>{['კაფეში შეკვეთა', 'გასაუბრება სამსახურში', 'მოგზაურობა და აეროპორტი', 'ახალი ადამიანის გაცნობა', 'თავისუფალი საუბარი'].map((scenario) => <option key={scenario}>{scenario}</option>)}</select></label><p>მწვრთნელი შენს დონეს მოერგება და საუბარს გაგრძელების კითხვით წარმართავს.</p></div></aside>
      <section className="chat-panel panel"><div className="chat-header"><span className="coach-avatar"><Icon name="spark" size={18} /></span><div><strong>AI English Coach</strong><small><i /> {conversationId ? 'საუბარი გრძელდება' : 'მზად არის სასაუბროდ'}</small></div><span className="chat-level">{profile.cefr_level || 'A2'} level</span></div><div className="chat-messages" aria-live="polite">{conversationMessages.length ? conversationMessages.map((message, index) => <ChatBubble key={message.id || `${index}-${message.role}`} message={message} />) : <div className="chat-welcome"><span className="chat-welcome-icon"><Icon name="chat" size={22} /></span><p className="eyebrow">Let's practice English</p><h3>დავიწყოთ საუბარი</h3><p>აირჩიე სცენარი და დაწერე პირველი წინადადება ინგლისურად. შეცდომების შემთხვევაში აგიხსნი, როგორ თქვა უფრო ბუნებრივად.</p><div className="prompt-suggestions">{['Hi, can I see the menu?', 'I would like a coffee, please.', 'Could you help me?'].map((suggestion) => <button key={suggestion} onClick={() => setConversationInput(suggestion)}>{suggestion} <Icon name="arrow" size={13} /></button>)}</div></div>}</div><form className="chat-composer" onSubmit={sendConversationMessage}><textarea rows="2" maxLength="2000" value={conversationInput} onChange={(event) => setConversationInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendConversationMessage(event) } }} placeholder="დაწერე ინგლისურად… (Enter გასაგზავნად)" /><Button aria-label="შეტყობინების გაგზავნა" disabled={busy || !conversationInput.trim()}>{busy ? <span className="button-spinner" /> : <Icon name="send" size={17} />}</Button><small>AI პასუხები სასწავლო უკუკავშირია. Enter გასაგზავნად · Shift+Enter ახალი ხაზი</small></form></section></div>
  </div>
}

function ChatBubble({ message }) {
  const assistant = message.role === 'assistant'
  return <div className={`chat-message ${assistant ? 'message-assistant' : 'message-user'}`}>{assistant && <span className="message-avatar"><Icon name="spark" size={14} /></span>}<div className="message-stack"><div className="message-bubble">{message.content}</div>{assistant && (message.feedback?.corrections?.length > 0 || message.feedback?.encouragement) && <div className="message-feedback">{message.feedback.encouragement && <p>{message.feedback.encouragement}</p>}{message.feedback.corrections?.map((correction, index) => <div key={index}><strong>{correction.original} → {correction.correction}</strong><span>{correction.explanation}</span></div>)}</div>}</div></div>
}

function ProgressPage({ progress, progressRows, lessons, vocabulary, reviewQueue, navigate }) {
  const scoreRows = progressRows.filter((item) => item.score !== null && item.score !== undefined).slice(0, 8).reverse()
  const maxScore = Math.max(100, ...scoreRows.map((item) => item.score || 0))
  return <div className="content-page"><SectionHeading eyebrow="შენი გზა" title="პროგრესი, რომელიც გროვდება" description="შეხედე შენს ყოველდღიურ ნაბიჯებს — თითოეულს მნიშვნელობა აქვს." />
    <section className="progress-hero"><div><span className="eyebrow">მიმდინარე დონე</span><div className="progress-level">{progress?.current_cefr_level || 'A2'}<span>CEFR</span></div><p>გააგრძელე რეგულარული პრაქტიკა, რომ შემდეგ დონეს მიუახლოვდე.</p></div><div className="level-path"><div className="level-path-line"><span style={{ width: `${Math.max(12, (['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].indexOf(progress?.current_cefr_level || 'A2') + 1) * 16.6)}%` }} /></div><div className="level-path-labels">{['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((level) => <span className={level === progress?.current_cefr_level ? 'path-current' : ''} key={level}>{level}</span>)}</div><span className="progress-goal">მიზანი · B2</span></div></section>
    <section className="stat-grid progress-stats"><StatCard icon="flame" label="აქტიური დღეების სერია" value={progress?.daily_streak ?? 0} suffix="დღე" tone="peach" caption="დღეიდან გააგრძელე" /><StatCard icon="words" label="ნასწავლი სიტყვები" value={vocabulary.length} suffix="სიტყვა" tone="lavender" caption="პირად ლექსიკონში" /><StatCard icon="book" label="დასრულებული გაკვეთილი" value={lessons.filter((lesson) => lesson.status === 'completed').length} suffix="გაკვეთილი" tone="mint" caption="შენი ბიბლიოთეკიდან" /><StatCard icon="target" label="შენარჩუნებული სიტყვები" value={progress?.vocabulary_retention_30d_percent ?? '—'} suffix="%" tone="blue" caption={`${progress?.vocabulary_reviews_30d ?? 0} გამეორება · 30 დღეში`} /></section>
    <div className="progress-columns"><section className="panel chart-panel"><div className="panel-heading"><div><p className="eyebrow">Quiz-ის შედეგები</p><h2>შენი ბოლო შეფასებები</h2></div><span className="soft-count">{scoreRows.length} შედეგი</span></div>{scoreRows.length ? <div className="score-chart" role="img" aria-label="ბოლო სავარჯიშოების ქულები">{scoreRows.map((item, index) => <div className="chart-column" key={item.id}><span className="chart-score">{Math.round(item.score)}%</span><div className="chart-track"><span style={{ height: `${Math.max(5, (item.score / maxScore) * 100)}%` }} /></div><small>{new Date(item.activity_date).toLocaleDateString('ka-GE', { day: 'numeric', month: 'short' })}</small></div>)}</div> : <EmptyState icon="chart" title="შედეგები ჯერ არ არის" text="შეასრულე პირველი Quiz და აქ გამოჩნდება შეფასებების ისტორია." action={<Button variant="quiet" onClick={() => navigate('practice')}>პრაქტიკის დაწყება <Icon name="arrow" size={15} /></Button>} />}</section>
      <section className="panel activity-panel"><div className="panel-heading"><div><p className="eyebrow">ბოლო 7 დღე</p><h2>აქტივობა</h2></div><span className="activity-badge"><Icon name="clock" size={15} /> {Math.round((progress?.last_7_days?.duration_seconds || 0) / 60)} წთ</span></div><div className="activity-summary"><div><strong>{progress?.last_7_days?.activities ?? 0}</strong><span>სასწავლო აქტივობა</span></div><div><strong>{progress?.last_7_days?.words_learned ?? 0}</strong><span>ახალი სიტყვა</span></div></div><div className="activity-days">{Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setDate(day.getDate() - 6 + index); const key = day.toISOString().slice(0, 10); const hasActivity = progressRows.some((row) => row.activity_date === key); return <div className="activity-day" key={key}><span className={hasActivity ? 'day-active' : ''} title={key}>{hasActivity ? <Icon name="check" size={14} /> : ''}</span><small>{day.toLocaleDateString('ka-GE', { weekday: 'narrow' })}</small></div> })}</div><p className="activity-note">{reviewQueue.length ? `${reviewQueue.length} სიტყვა მზად არის გასამეორებლად.` : 'კარგი ტემპია — გააგრძელე ყოველდღიური პრაქტიკა.'}</p></section></div>
  </div>
}

export default App
