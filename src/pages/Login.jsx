import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '../store/useStore';
import { Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const login = useStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.message || 'Invalid email or password.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-base)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--accent-primary)]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--accent-primary)]/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-2xl p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 mb-4">
            <Lock size={28} className="text-[var(--accent-primary)]" />
          </div>
          <h1 className="text-4xl font-display font-bold text-[var(--text-primary)] tracking-tight">
            ASH <span className="text-[var(--accent-primary)]">Dashboard</span>
          </h1>
          <p className="text-[var(--text-muted)] font-mono text-xs uppercase tracking-widest mt-3">Secure Access Required</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              className="bg-[var(--semantic-negative)]/10 border border-[var(--semantic-negative)]/30 text-[var(--semantic-negative)] p-3 rounded-lg flex items-center gap-2 text-sm font-mono"
            >
              <AlertCircle size={16} /> {error}
            </motion.div>
          )}

          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] uppercase mb-2 ml-1 tracking-wider">Email</label>
            <div className="relative">
              <Mail size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@yourdomain.com"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl py-3.5 pl-11 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-mono text-sm"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-[var(--text-secondary)] uppercase mb-2 ml-1 tracking-wider">Password</label>
            <div className="relative">
              <Lock size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl py-3.5 pl-11 pr-4 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)] transition-all font-mono text-sm tracking-widest"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--accent-primary)] hover:opacity-90 disabled:opacity-60 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-6 font-display tracking-widest"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Authenticating...</> : <>SIGN IN <Lock size={16} /></>}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
