import { useState, FormEvent } from 'react';
import { Scale, Lock, Loader2 } from 'lucide-react';

interface LoginScreenProps {
  onSubmit: (password: string) => Promise<boolean>;
  error: string | null;
  isSubmitting: boolean;
}

export function LoginScreen({ onSubmit, error, isSubmitting }: LoginScreenProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password || isSubmitting) return;
    const ok = await onSubmit(password);
    if (ok) setPassword('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-xl shadow-lg p-8">
        <div className="flex items-center gap-2 justify-center mb-1 text-amber-600">
          <Scale className="w-6 h-6" />
          <span className="font-bold text-lg text-slate-900">FCWA Case Vault</span>
        </div>
        <p className="text-center text-slate-500 text-sm mb-6">Enter your access password to continue.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
            />
          </div>

          {error && (
            <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={!password || isSubmitting}
            className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-semibold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSubmitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Admin has full access. Read Only can view but not modify case data.
        </p>
      </div>
    </div>
  );
}
