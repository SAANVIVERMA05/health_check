import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Activity, ArrowUpRight, Brain, Check, ChevronRight, Clock3, Footprints, HeartPulse, Moon, Play, ShieldCheck, Sparkles, Volume2, Wind } from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL || 'hr.demo@example.com';
const initialForm = { name: 'HR Demo User', email: DEMO_EMAIL, sleep_duration: '', work_hours: '', mood_level: 5, screen_time: '', physical_activity: '', heart_rate: '', blood_oxygen: '' };
const formatDate = (value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const formatToday = () => new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const levelClass = (level) => level.toLowerCase();

function App() {
  const [form, setForm] = useState(initialForm);
  const [history, setHistory] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [listening, setListening] = useState(false);
  const [historyRange, setHistoryRange] = useState(7);
  const [assistantMessage, setAssistantMessage] = useState('Ask me about your stress, history, or next best step.');
  const recognitionRef = useRef(null);
  const [notice, setNotice] = useState('Connect your API to load your private wellness data.');
  const latest = history[0];
  const visibleHistory = history.filter((item) => Date.now() - new Date(item.created_at).getTime() <= historyRange * 24 * 60 * 60 * 1000);
  const averageScore = visibleHistory.length ? Math.round(visibleHistory.reduce((total, item) => total + item.stress_score, 0) / visibleHistory.length) : null;
  const highStressDays = visibleHistory.filter((item) => item.stress_level === 'High').length;

  const loadDashboard = async (email) => {
    if (!email) return;
    setLoadingHistory(true);
    try {
      const response = await fetch(`${API}/users/${encodeURIComponent(email)}/dashboard`);
      if (response.status === 404) {
        setHistory([]); setUser(null); setNotice('No saved check-ins yet. Complete your first check-in below.');
        return;
      }
      if (!response.ok) throw new Error('Unable to load dashboard');
      const data = await response.json();
      setUser(data.user); setHistory(data.history); setForm((current) => ({ ...current, name: data.user.name, email: data.user.email })); setNotice(`Showing ${data.user.name}'s saved history.`);
    } catch {
      setNotice('The API is unavailable. Start the backend to load and save your data.');
    } finally { setLoadingHistory(false); }
  };

  useEffect(() => { loadDashboard(DEMO_EMAIL); }, []);

  useEffect(() => {
    const buttons = [...document.querySelectorAll('.segmented button')];
    const handlers = buttons.map((button) => {
      const handler = () => setHistoryRange(button.textContent.includes('30') ? 30 : button.textContent.includes('3 months') ? 90 : 7);
      button.addEventListener('click', handler);
      return [button, handler];
    });
    return () => handlers.forEach(([button, handler]) => button.removeEventListener('click', handler));
  });

  const updateField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const updateNumber = (name, value) => updateField(name, value === '' ? '' : Number(value));
  const openProfile = () => {
    document.getElementById('checkin')?.scrollIntoView({ behavior: 'smooth' });
    window.setTimeout(() => document.querySelector('#checkin input[type="email"]')?.focus(), 350);
  };

  const speak = (message) => {
    setAssistantMessage(message);
    setNotice(message);
    if ('speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
    }
  };

  const handleAssistantRequest = (request) => {
    const command = request.toLowerCase();
    if (command.includes('history') || command.includes('historical')) {
      speak(history.length ? `You have ${history.length} saved check-ins. Your latest score is ${history[0].stress_score}, and your previous score was ${history[1]?.stress_score ?? 'not available'}.` : 'You do not have any saved check-ins yet.');
    } else if (command.includes('recommend') || command.includes('advice')) {
      speak(latest?.recommendations?.length ? latest.recommendations.join(' ') : 'Complete a check-in to receive personalized recommendations.');
    } else if (command.includes('stress') || command.includes('score') || command.includes('check')) {
      speak(latest ? `Your stress level is ${latest.stress_level}, with a score of ${latest.stress_score} out of 100. ${latest.summary}` : 'There is no stress assessment yet. Complete a check-in first.');
    } else if (command.includes('reset') || command.includes('breath') || command.includes('relax')) {
      speak('Let us take a gentle reset. Inhale slowly for four counts, hold for four, and exhale for six. Repeat that three times, then notice one thing you can release for the next few minutes.');
    } else {
      speak('Try saying check my stress level, show my history, or give recommendations.');
    }
  };

  const handleVoiceCommand = (transcript) => handleAssistantRequest(transcript);

  const startVoiceAssistant = () => {
    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'en-US'; recognition.interimResults = false; recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setNotice('Listening for a PulseCheck command...'); };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNotice(`Heard: “${transcript}”`);
      handleVoiceCommand(transcript);
    };
    recognition.onerror = (event) => {
      const message = event.error === 'not-allowed' ? 'Microphone permission was denied.' : event.error === 'no-speech' ? 'No speech detected. Try again.' : 'Voice input failed. Try again.';
      setListening(false); setNotice(message);
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    try { recognition.start(); } catch { setListening(false); setNotice('Voice input is already starting. Try again in a moment.'); }
  };

  useEffect(() => () => {
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const submit = async (event) => {
    event.preventDefault(); setLoading(true); setNotice('');
    try {
      const response = await fetch(`${API}/assessments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        const detail = Array.isArray(error.detail) ? error.detail.map((item) => `${item.loc?.at(-1) || 'field'}: ${item.msg}`).join(', ') : error.detail;
        throw new Error(detail || 'The API could not save this check-in.');
      }
      const result = await response.json(); setHistory((items) => [result, ...items]); setUser({ name: form.name, email: form.email }); setNotice('Check-in saved to your personal timeline.');
    } catch (error) {
      setNotice(error.message || 'Unable to save check-in. Check that the API is running.');
    } finally { setLoading(false); }
  };

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark"><Activity size={19} /></span><span>pulse<span className="brand-accent">check</span></span></a><div className="header-actions"><span className="sync-dot"><span /> {notice || 'Private wellness space'}</span><button className={`voice-button ${listening ? 'listening' : ''}`} onClick={startVoiceAssistant} aria-label="Start voice assistant" title="Say: check my stress level"><Volume2 size={16} /> {listening ? 'Listening...' : 'Voice'}</button><button className="avatar" onClick={openProfile} aria-label="Switch profile" title="Switch profile">{user?.name ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : '--'}</button></div></header>
    <main id="top" className="page">
      <section className="intro"><div><p className="eyebrow"><span className="live-line" /> YOUR DAILY PULSE</p><h1>{user ? `Good morning, ${user.name.split(' ')[0]}.` : 'Understand your stress.'}</h1><p className="intro-copy">A clearer read on how your body and mind are doing today.</p></div><div className="intro-actions"><div className="date-stamp"><Clock3 size={15} /> {formatToday()}</div><button className={`voice-button voice-launch ${listening ? 'listening' : ''}`} onClick={startVoiceAssistant}><Volume2 size={16} /> {listening ? 'Listening...' : 'Ask PulseCheck'}</button></div></section>
      <section className="metric-grid"><div className="score-panel">{latest ? <><div className="panel-kicker">TODAY'S STRESS SCORE <span className="info">i</span></div><div className="score-content"><div className="score-ring" style={{ '--score': `${latest.stress_score * 3.6}deg` }}><div><strong>{latest.stress_score}</strong><small>/ 100</small></div></div><div className="score-copy"><span className={`status-pill ${levelClass(latest.stress_level)}`}><span /> {latest.stress_level} stress</span><p>{latest.summary}</p><button className="text-button" onClick={() => document.getElementById('checkin').scrollIntoView({ behavior: 'smooth' })}>Check in again <ArrowUpRight size={15} /></button></div></div></> : <EmptyScore />}</div><div className="signal-card"><div className="panel-kicker">RECOVERY SIGNALS</div><div className="signal-list"><Signal icon={<Moon />} label="Sleep" value={latest ? `${latest.sleep_duration}h` : '--'} hint="last night" /><Signal icon={<HeartPulse />} label="Heart rate" value={latest ? `${latest.heart_rate}` : '--'} hint="resting bpm" /><Signal icon={<Footprints />} label="Movement" value={latest ? `${latest.physical_activity}m` : '--'} hint="today" /></div></div></section>
      <section className="history-overview"><div><p className="eyebrow">HISTORY OVERVIEW</p><h2>Your wellness timeline</h2><p className="history-subtitle">Daily, weekly, and monthly summaries from your saved check-ins.</p></div><div className="history-stats"><div><strong>{visibleHistory.length || '--'}</strong><span>check-ins</span></div><div><strong>{averageScore ?? '--'}</strong><span>average score</span></div><div><strong>{highStressDays}</strong><span>high-stress days</span></div></div></section>
      <section className="assistant-panel"><div className="assistant-avatar"><Volume2 size={20} /></div><div className="assistant-content"><p className="eyebrow">PULSECHECK ASSISTANT</p><h2>Here to help you make sense of today.</h2><p className="assistant-message">{assistantMessage}</p><div className="assistant-actions"><button onClick={() => handleAssistantRequest('check my stress level')}>Check my stress</button><button onClick={() => handleAssistantRequest('show my history')}>Show my history</button><button onClick={() => handleAssistantRequest('give recommendations')}>Give recommendations</button><button onClick={() => handleAssistantRequest('help me reset')}>Help me reset</button></div></div></section>
      <div className="content-grid"><div className="main-column"><section className="section-block"><div className="section-heading"><div><p className="eyebrow">YOUR PATTERN</p><h2>Stress over time</h2></div><div className="segmented"><button className="active">7 days</button><button>30 days</button><button>3 months</button></div></div>{loadingHistory ? <div className="empty-chart">Loading your history...</div> : <TrendChart history={history} />}</section><section className="section-block insights"><div className="section-heading"><div><p className="eyebrow">A LITTLE CONTEXT</p><h2>What might help today</h2></div><button className="icon-button" aria-label="Play recommendations"><Play size={16} /></button></div><div className="insight-grid"><article><span className="insight-icon coral"><Moon size={18} /></span><div><h3>Protect your sleep</h3><p>{latest ? 'Your latest check-in includes sleep data we can use to spot patterns.' : 'Complete a check-in to get a sleep insight based on your own data.'}</p><a href="#checkin">Check in now <ChevronRight size={14} /></a></div></article><article><span className="insight-icon blue"><Wind size={18} /></span><div><h3>Make room to reset</h3><p>Small recovery breaks can help your nervous system downshift.</p><a href="#checkin">Start a reset <ChevronRight size={14} /></a></div></article></div></section></div><aside className="side-column"><section className="factor-card"><div className="section-heading"><div><p className="eyebrow">LATEST READ</p><h2>Key factors</h2></div><Sparkles size={18} className="sparkle" /></div>{latest ? <><ul className="factor-list">{latest.factors.map((factor, index) => <li key={factor}><span className={`factor-dot dot-${index}`} />{factor}<span className="factor-arrow">↗</span></li>)}</ul><div className="recommendation"><span className="rec-icon"><Check size={16} /></span><div><strong>Your next best step</strong><p>{latest.recommendations[0]}</p></div></div></> : <p className="empty-copy">Your contributing factors and personalized recommendations will appear after your first assessment.</p>}</section><section className="history-card"><div className="section-heading"><div><p className="eyebrow">YOUR JOURNEY</p><h2>Recent check-ins</h2></div><button className="small-link">See all</button></div>{history.length ? history.slice(0, 4).map((item) => <div className="history-row" key={item.id}><span className={`history-status ${levelClass(item.stress_level)}`} /><span>{formatDate(item.created_at)}</span><strong>{item.stress_score}</strong><span className={`level-text ${levelClass(item.stress_level)}`}>{item.stress_level}</span></div>) : <p className="empty-copy">No check-ins yet.</p>}</section></aside></div>
      <section id="checkin" className="checkin-section"><div className="checkin-intro"><p className="eyebrow">A MOMENT FOR YOU</p><h2>How are you feeling today?</h2><p>Small signals add up. Share a few details and we’ll help you notice the pattern.</p><div className="privacy"><ShieldCheck size={16} /> Your data stays private to your account.</div></div><form onSubmit={submit} className="checkin-form"><div className="form-row"><label>Your name<input value={form.name} onChange={(e) => updateField('name', e.target.value)} required /></label><label>Email address<input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} onBlur={(e) => loadDashboard(e.target.value)} required /></label></div><div className="form-fields"><Field label="Sleep duration" unit="hours" name="sleep_duration" value={form.sleep_duration} step="0.1" onChange={updateNumber} /><Field label="Work hours" unit="hours" name="work_hours" value={form.work_hours} step="0.5" onChange={updateNumber} /><Field label="Screen time" unit="hours" name="screen_time" value={form.screen_time} step="0.1" onChange={updateNumber} /><Field label="Physical activity" unit="minutes" name="physical_activity" value={form.physical_activity} step="1" onChange={updateNumber} /><Field label="Resting heart rate" unit="bpm" name="heart_rate" value={form.heart_rate} step="1" onChange={updateNumber} /><Field label="Blood oxygen" unit="SpO₂ %" name="blood_oxygen" value={form.blood_oxygen} step="0.1" onChange={updateNumber} /></div><label className="mood-field">Mood level <span>1 — low, 10 — great</span><input type="range" min="1" max="10" value={form.mood_level || 5} onChange={(e) => updateNumber('mood_level', e.target.value)} /><output>{form.mood_level || '--'}<small>/10</small></output></label><button className="submit-button" disabled={loading}>{loading ? 'Reading your signals...' : 'Get my stress read'} <ArrowUpRight size={17} /></button></form></section>
    </main><footer><span>pulse<span className="brand-accent">check</span> / mindful data, better days</span><span>Not a medical diagnosis. Listen to your body.</span></footer>
  </div>;
}

function EmptyScore() { return <><div className="panel-kicker">TODAY'S STRESS SCORE <span className="info">i</span></div><div className="empty-score"><Activity size={25} /><div><strong>No assessment yet</strong><p>Complete your first check-in to see your score.</p></div></div></>; }
function Signal({ icon, label, value, hint }) { return <div className="signal"><span className="signal-icon">{icon}</span><div><span>{label}</span><strong>{value}</strong><small>{hint}</small></div></div>; }
function Field({ label, unit, name, value, step, onChange }) { return <label className="number-field">{label}<div><input type="number" min="0" step={step} value={value} onChange={(e) => onChange(name, e.target.value)} required /><span>{unit}</span></div></label>; }
function TrendChart({ history }) { const points = history.slice(0, 7).reverse(); if (!points.length) return <div className="empty-chart">Your stress trend will appear after you save an assessment.</div>; const coords = points.map((item, index) => `${(index / Math.max(points.length - 1, 1)) * 100},${100 - (item.stress_score / 100) * 80 - 10}`).join(' '); return <div className="chart"><div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div><div className="chart-area"><svg viewBox="0 0 100 100" preserveAspectRatio="none"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#e6a38e" stopOpacity=".28" /><stop offset="1" stopColor="#e6a38e" stopOpacity="0" /></linearGradient></defs><polygon points={`0,100 ${coords} 100,100`} fill="url(#chartFill)" /><polyline points={coords} fill="none" stroke="#ce765b" strokeWidth="1.8" vectorEffect="non-scaling-stroke" />{points.map((item, index) => <circle key={item.id} cx={(index / Math.max(points.length - 1, 1)) * 100} cy={100 - (item.stress_score / 100) * 80 - 10} r="2.4" fill="#fff" stroke="#ce765b" strokeWidth="1.3" vectorEffect="non-scaling-stroke" />)}</svg><div className="chart-x">{points.map((item) => <span key={item.id}>{formatDate(item.created_at)}</span>)}</div></div></div>; }

createRoot(document.getElementById('root')).render(<App />);
