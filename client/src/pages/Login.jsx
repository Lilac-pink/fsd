import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, register, errMsg } from '../api';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { saveLogin } = useAuth();
  const nav = useNavigate();

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) await register(form);
      const { data } = await login({ email: form.email, password: form.password });
      saveLogin(data);
      nav('/');
    } catch (err) {
      setError(errMsg(err, 'Could not reach the server. Is the backend running?'));
    } finally {
      setLoading(false);
    }
  };

  const input = 'w-full rounded-md border-2 border-ink/15 bg-white px-3 py-2 focus:border-signal focus:outline-none';
  return (
    <form onSubmit={submit} className="mx-auto mt-8 max-w-sm space-y-3 rounded-xl border-2 border-ink bg-white p-6">
      <h2 className="text-xl font-bold">{isRegister ? 'Create account' : 'Log in'}</h2>
      {isRegister && <input className={input} name="name" placeholder="Name" onChange={handle} required />}
      <input className={input} name="email" type="email" placeholder="Email" onChange={handle} required />
      <input className={input} name="password" type="password" placeholder="Password" onChange={handle} required />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button disabled={loading} className="w-full rounded-md bg-ink py-2 font-semibold text-white hover:bg-ink/90 disabled:opacity-60">
        {loading ? 'Please wait...' : isRegister ? 'Sign up' : 'Log in'}
      </button>
      <button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); }} className="w-full text-sm text-ink/70 underline">
        {isRegister ? 'Already have an account? Log in' : 'New here? Create an account'}
      </button>
    </form>
  );
}
