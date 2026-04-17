import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { BrandButton, FadeIn } from '../components/ui';

export function StudentLogin() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const signup = useAuthStore((s) => s.signup);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate('/home', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-dark">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#9ca3af]">Loading...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = mode === 'login'
      ? await login(email, password)
      : await signup(email, password, 'student');

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigate('/home', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-cinematic flex items-center justify-center px-4 py-16">
      {/* Ambient glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[500px] rounded-full bg-brand-accent/5 blur-[120px]" />
      </div>

      <FadeIn y={16} className="relative w-full max-w-md z-10">
        <div className="bg-brand-dark-card border border-white/10 rounded-2xl shadow-2xl shadow-black/40 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-accent to-brand-accent-dark flex items-center justify-center mx-auto mb-5">
              <GraduationCap className="w-6 h-6 text-brand-dark" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-2">
              Crash Course
            </p>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight">
              {mode === 'login' ? 'Welcome back' : 'Join the adventure'}
            </h1>
            <p className="text-sm text-[#9ca3af] mt-2">
              {mode === 'login'
                ? 'Sign in to continue where you left off.'
                : 'Create your account to begin the course.'}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl">
              {error}
            </div>
          )}

          {/* Form */}
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
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors"
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
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-accent/50 focus:border-brand-accent/50 transition-colors"
              />
            </div>

            <BrandButton
              type="submit"
              variant="primary"
              size="lg"
              isLoading={submitting}
              fullWidth
              className="mt-2"
            >
              {submitting
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </BrandButton>
          </form>

          {/* Toggle mode */}
          <p className="text-center text-sm text-[#9ca3af] mt-6">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError('');
                  }}
                  className="text-brand-accent font-medium hover:text-brand-accent-light transition-colors"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-brand-accent font-medium hover:text-brand-accent-light transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </FadeIn>
    </div>
  );
}
