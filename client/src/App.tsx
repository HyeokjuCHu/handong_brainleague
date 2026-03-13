import { useState, useEffect } from 'react'
import './App.css'

type User = {
  id: number
  username: string
  role: 'user' | 'admin'
}

type Subject = {
  id: number
  name: string
}

type Question = {
  id: number
  text: string
  options: string[]
  answer: number
}

type View = 'LANDING' | 'DASHBOARD' | 'ADMIN' | 'QUIZ' | 'RESULT'

function App() {
  const [view, setView] = useState<View>('LANDING')
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [ranking, setRanking] = useState<{username: string, total_points: number}[]>([])
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answers, setAnswers] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(0)
  const [message, setMessage] = useState('')

  // Auth States
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [isAdminRegister, setIsAdminRegister] = useState(false)
  const [adminSecret, setAdminSecret] = useState('')

  // Admin States
  const [newSubject, setNewSubject] = useState('')
  const [materialContent, setMaterialContent] = useState('')
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [adminSubjectId, setAdminSubjectId] = useState<number | null>(null)

  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user')
      if (savedUser) {
        const parsedUser = JSON.parse(savedUser)
        setUser(parsedUser)
        setView(parsedUser.role === 'admin' ? 'ADMIN' : 'DASHBOARD')
      }
    }
    fetchRanking()
    fetchSubjects()
  }, [token])

  const fetchSubjects = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/subjects')
      const data = await res.json()
      setSubjects(data)
    } catch (err) { console.error(err) }
  }

  const fetchRanking = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/ranking')
      const data = await res.json()
      setRanking(data)
    } catch (err) { console.error(err) }
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const endpoint = isRegister ? '/api/register' : '/api/login'
    try {
      const res = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username, 
          password, 
          role: isAdminRegister ? 'admin' : 'user',
          adminSecret: isAdminRegister ? adminSecret : undefined
        })
      })
      const data = await res.json()
      if (res.ok) {
        if (!isRegister) {
          setToken(data.token)
          setUser(data.user)
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(data.user))
          setView(data.user.role === 'admin' ? 'ADMIN' : 'DASHBOARD')
        } else {
          setIsRegister(false)
          setMessage('Registered successfully! Please login.')
        }
      } else {
        setMessage(data.message)
      }
    } catch (err) {
      setMessage('Server error')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setView('LANDING')
  }

  // User Actions
  const startQuiz = async (subjectId: number) => {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('http://localhost:3000/api/quiz/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject_id: subjectId })
      })
      const data = await res.json()
      if (res.ok) {
        setQuestions(data.questions)
        setAnswers(new Array(data.questions.length).fill(-1))
        setSelectedSubject(subjectId)
        setCurrentIdx(0)
        setView('QUIZ')
      } else {
        setMessage(data.message)
      }
    } catch (err) {
      setMessage('Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  const submitQuiz = async () => {
    const finalScore = questions.reduce((acc, q, idx) => acc + (q.answer === answers[idx] ? 1 : 0), 0)
    setScore(finalScore)
    try {
      await fetch('http://localhost:3000/api/quiz/submit', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject_id: selectedSubject, score: finalScore })
      })
      setView('RESULT')
      fetchRanking()
    } catch (err) { console.error(err) }
  }

  // Admin Actions
  const addSubject = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/admin/subjects', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newSubject })
      })
      if (res.ok) {
        setNewSubject('')
        fetchSubjects()
        setMessage('Subject added!')
      }
    } catch (err) { console.error(err) }
  }

  const addMaterial = async () => {
    if (!adminSubjectId) return
    try {
      const res = await fetch('http://localhost:3000/api/admin/materials', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subject_id: adminSubjectId, content: materialContent })
      })
      if (res.ok) {
        setMaterialContent('')
        setMessage('Material added!')
      }
    } catch (err) { console.error(err) }
  }

  const uploadMaterialFile = async () => {
    if (!adminSubjectId || !materialFile) return
    setLoading(true)
    const formData = new FormData()
    formData.append('subject_id', adminSubjectId.toString())
    formData.append('file', materialFile)

    try {
      const res = await fetch('http://localhost:3000/api/admin/materials/upload', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })
      if (res.ok) {
        setMaterialFile(null)
        setMessage('Material uploaded and added!')
      } else {
        const data = await res.json()
        setMessage(data.message)
      }
    } catch (err) { 
      console.error(err)
      setMessage('Upload failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="handong-container">
      <header>
        <h1 onClick={() => setView(user?.role === 'admin' ? 'ADMIN' : 'DASHBOARD')}>Handong BrainLeague</h1>
        {user && <div className="user-info">
          <span>{user.username} ({user.role})</span>
          <button onClick={handleLogout}>Logout</button>
        </div>}
      </header>

      <main className="fade-in">
        {view === 'LANDING' && (
          <section className="auth-box">
            <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
            <form onSubmit={handleAuth}>
              <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
              {isRegister && (
                <div className="admin-toggle">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={isAdminRegister} onChange={e => setIsAdminRegister(e.target.checked)} />
                    Register as Admin
                  </label>
                  {isAdminRegister && (
                    <input type="password" placeholder="Admin Secret Key" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} required />
                  )}
                </div>
              )}
              <button type="submit" disabled={loading}>{loading ? 'Processing...' : (isRegister ? 'Register' : 'Login')}</button>
            </form>
            <p onClick={() => {
              setIsRegister(!isRegister)
              setIsAdminRegister(false)
            }} className="toggle-auth">
              {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
            </p>
            {message && <p className="error-msg">{message}</p>}
          </section>
        )}

        {view === 'DASHBOARD' && (
          <section className="dashboard">
            <div className="subjects-grid">
              <h3>Select a Subject</h3>
              <div className="grid">
                {subjects.map(s => (
                  <div key={s.id} className="subject-card" onClick={() => startQuiz(s.id)}>
                    {s.name}
                  </div>
                ))}
              </div>
              {loading && <p>Generating AI Quiz... Please wait.</p>}
              {message && <p className="error-msg">{message}</p>}
            </div>
            
            <div className="ranking-panel">
              <h3>Hall of Fame (Ranking)</h3>
              <ol>
                {ranking.map((r, i) => (
                  <li key={i}>
                    <span className="rank">{i + 1}</span>
                    <span className="name">{r.username}</span>
                    <span className="points">{r.total_points} pts</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        {view === 'ADMIN' && (
          <section className="admin-panel">
            <h2>Admin Dashboard</h2>
            {message && <p className="success-msg">{message}</p>}
            <div className="admin-grid">
              <div className="admin-box">
                <h3>Add New Subject</h3>
                <input type="text" placeholder="Subject Name" value={newSubject} onChange={e => setNewSubject(e.target.value)} />
                <button onClick={addSubject}>Add Subject</button>
              </div>
              <div className="admin-box">
                <h3>Add Lecture Material</h3>
                <select onChange={e => setAdminSubjectId(Number(e.target.value))} value={adminSubjectId || ''}>
                  <option value="" disabled>Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                
                <div className="upload-section">
                  <h4>Option 1: Paste Text</h4>
                  <textarea placeholder="Paste lecture material content here..." value={materialContent} onChange={e => setMaterialContent(e.target.value)} rows={5} />
                  <button onClick={addMaterial} disabled={!adminSubjectId || !materialContent}>Add Text Material</button>
                </div>

                <div className="upload-section" style={{marginTop: '20px', borderTop: '1px solid #ddd', paddingTop: '20px'}}>
                  <h4>Option 2: Upload File (PDF, PPTX, DOCX)</h4>
                  <input type="file" accept=".pdf,.pptx,.docx" onChange={e => setMaterialFile(e.target.files ? e.target.files[0] : null)} />
                  <button onClick={uploadMaterialFile} disabled={!adminSubjectId || !materialFile || loading}>
                    {loading ? 'Uploading...' : 'Upload & Add File'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {view === 'QUIZ' && (
          <section className="quiz-view">
            <div className="quiz-header">
              <span>Question {currentIdx + 1} / {questions.length}</span>
              <div className="progress-bar"><div className="fill" style={{width: `${((currentIdx+1)/questions.length)*100}%`}}></div></div>
            </div>
            <div className="q-card">
              <h2>{questions[currentIdx].text}</h2>
              <div className="options">
                {questions[currentIdx].options.map((opt, idx) => (
                  <button key={idx} className={answers[currentIdx] === idx ? 'selected' : ''} onClick={() => {
                    const newAns = [...answers]
                    newAns[currentIdx] = idx
                    setAnswers(newAns)
                  }}>{opt}</button>
                ))}
              </div>
              {currentIdx < questions.length - 1 ? 
                <button className="next-btn" onClick={() => setCurrentIdx(currentIdx + 1)} disabled={answers[currentIdx] === -1}>Next</button> :
                <button className="next-btn" onClick={submitQuiz} disabled={answers[currentIdx] === -1}>Finish</button>
              }
            </div>
          </section>
        )}

        {view === 'RESULT' && (
          <section className="result-view">
            <div className="res-card">
              <h2>Quiz Finished!</h2>
              <div className="score-display">
                <span className="big">{score}</span>
                <span>/ {questions.length}</span>
              </div>
              <p>Your total points have been updated in the Hall of Fame.</p>
              <button onClick={() => setView('DASHBOARD')}>Go to Dashboard</button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
