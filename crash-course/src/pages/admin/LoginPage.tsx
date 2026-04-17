import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Shield } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { BrandButton, FadeIn } from '../../components/ui';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    navigate('/admin', { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = mode === 'login'
      ? await login(email, password)
      : await signup(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate('/admin', { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white px-4 py-16">
      <FadeIn y={16} className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-brand-accent-dark flex items-center justify-center mx-auto mb-5">
            <GraduationCap className="w-6 h-6 text-brand-dark" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-2 flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3" />
            Instructor portal
          </p>
          <h1 className="font-display text-3xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h1>
          <p className="text-sm text-[#9ca3af] mt-2">
            {mode === 'login' ? 'Sign in to manage your courses.' : 'Start building your course today.'}
          </p>
        </div>

        <div className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-7">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors"
                placeholder="professor@university.edu"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-[0.15em] text-[#9ca3af] mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors"
                placeholder="Min. 6 characters"
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 px-4 py-3 rounded-xl">
                {error}
              </p>
            )}

            <BrandButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              fullWidth
              className="mt-2"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Sign up'}
            </BrandButton>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="text-sm text-brand-accent font-medium hover:text-brand-accent-light transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
