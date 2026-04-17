import { type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export function StudentLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const displayName = user?.displayName || 'Student';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      <header className="fixed top-0 left-0 right-0 bg-brand-dark/95 backdrop-blur-sm border-b border-white/5 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              type="button"
              className="flex items-center gap-3 group"
              onClick={() => navigate('/home')}
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-accent to-brand-accent-dark flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-brand-dark" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-white group-hover:text-brand-accent transition-colors">
                Crash Course
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                <div className="w-6 h-6 rounded-full bg-brand-accent/15 border border-brand-accent/30 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-brand-accent">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs font-medium text-[#9ca3af]">
                  {displayName}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#9ca3af] hover:text-white hover:bg-white/5 rounded-full transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                Log out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {children}
      </main>
    </div>
  );
}
