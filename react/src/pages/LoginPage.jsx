import { useState } from 'react';
import { ArrowRight, CheckCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { setApiUrl } from '../api/client';
import { Field } from '../components/FormField';
import { useNavigate } from '../hooks/useNavigate';

export default function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [error, setError] = useState('');
  const [apiUrl, setApiUrlState] = useState(localStorage.getItem('daymark_api') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api');
  const [showSettings, setShowSettings] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const credentials = {
      email: form.get('email'),
      password: form.get('password'),
      ...(mode === 'register' ? { name: form.get('name'), password_confirmation: form.get('password_confirmation') } : {}),
    };
    try {
      await signIn(credentials, mode);
      navigate('/', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><div className="brand-icon"><CheckCheck size={18} /></div><span>To-Do</span></div>
        <div className="auth-intro"><div className="auth-icon"><ShieldCheck size={20} /></div><div className="eyebrow">YOUR DAY, IN FOCUS</div><h1>{mode === 'login' ? 'Welcome back.' : 'Make room for what matters.'}</h1><p>{mode === 'login' ? 'Sign in to pick up where you left off.' : 'Create an account and start moving forward.'}</p></div>
        {error && <div className="error-banner">{error}</div>}
        <form className="form" onSubmit={handleSubmit}>
          {mode === 'register' && <Field label="Your name" name="name" placeholder="Jane Doe" required />}
          <Field label="Email address" name="email" type="email" placeholder="you@example.com" required />
          <Field label="Password" name="password" type="password" placeholder="Enter your password" required minLength={8} />
          {mode === 'register' && <Field label="Confirm password" name="password_confirmation" type="password" placeholder="Enter your password again" required minLength={8} />}
          <button className="primary-btn form-submit">{mode === 'login' ? 'Sign in' : 'Create account'}<ArrowRight size={16} /></button>
        </form>
        <p className="form-switch">{mode === 'login' ? 'New here?' : 'Already have an account?'} <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button></p>
        <button className="api-settings-toggle" onClick={() => setShowSettings(!showSettings)}>API connection settings</button>
        {showSettings && <form className="api-settings" onSubmit={(event) => { event.preventDefault(); setApiUrl(apiUrl); setShowSettings(false); }}><Field label="Laravel API base URL" name="apiUrl" value={apiUrl} onChange={(event) => setApiUrlState(event.target.value)} placeholder="http://localhost:8000/api"/><button className="secondary-btn">Save API address</button></form>}
      </section>
      <p className="auth-footer">Made for doing good work, at your own pace.</p>
    </main>
  );
}
