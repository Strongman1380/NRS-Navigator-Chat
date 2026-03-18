import { useState } from 'react';
import { LogIn, UserPlus, Shield, MessageCircle, Lock, BookmarkPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, signInAsGuest, signInWithGoogle } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name');
        }
        await signUp(email, password, fullName);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen h-screen-safe bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 safe-all">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 md:p-8">
          <div className="flex items-center justify-center mb-5 sm:mb-6">
            <div className="bg-blue-600 p-2.5 sm:p-3 rounded-xl">
              <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-center text-slate-900 mb-1.5">
            Next Right Step
          </h1>
          <p className="text-center text-slate-600 mb-4 text-sm sm:text-base">
            Recovery resource navigation — free, no account needed
          </p>

          {/* Confidentiality notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 mb-5 sm:mb-6">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  <strong>Your privacy is protected.</strong> All conversations are confidential regardless of whether you use a guest session or create an account. We do not share information with courts, probation, or law enforcement. No identifying information is required.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                await signInAsGuest();
              } catch (err: any) {
                setError(err.message || 'An error occurred');
              } finally {
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3 text-sm sm:text-base"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            Continue as Guest — Stay Private
          </button>

          {/* Google sign-in */}
          <button
            onClick={async () => {
              setLoading(true);
              setError('');
              try {
                await signInWithGoogle();
              } catch (err: any) {
                setError(err.message || 'An error occurred');
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full border border-slate-300 bg-white text-slate-700 py-2.5 sm:py-3 rounded-lg font-medium hover:bg-slate-50 active:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 mb-3 text-sm sm:text-base"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Account option */}
          {!showAccountForm && (
            <div className="mb-5 sm:mb-6">
              <button
                onClick={() => { setShowAccountForm(true); setIsSignUp(true); setError(''); }}
                className="w-full border-2 border-dashed border-slate-200 rounded-lg px-3 py-3 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
              >
                <div className="flex items-start gap-2.5">
                  <BookmarkPlus className="w-4 h-4 text-slate-400 group-hover:text-blue-500 mt-0.5 flex-shrink-0 transition-colors" />
                  <div className="text-left">
                    <p className="text-xs sm:text-sm font-medium text-slate-700 group-hover:text-blue-700 transition-colors">
                      Create a free account
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 leading-relaxed">
                      Save conversations, access your personal dashboard, and get reminders. Same confidential service — always free.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {showAccountForm && (
            <>
              <div className="relative mb-4 sm:mb-5 mt-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-3 bg-white text-slate-500">
                    {isSignUp ? 'create an account' : 'sign in to your account'}
                  </span>
                </div>
              </div>

              {isSignUp && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5 mb-4">
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    <strong>Creating an account is optional and always free.</strong> You'll get the same confidential support — plus the ability to save conversations and use your personal dashboard.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                {isSignUp && (
                  <div>
                    <label htmlFor="fullName" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your name"
                      required
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 sm:px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-lg text-xs sm:text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-2.5 sm:py-3 rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  {loading ? (
                    'Please wait...'
                  ) : isSignUp ? (
                    <>
                      <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
                      Create Free Account
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                      Sign In
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 sm:mt-5 text-center">
                <button
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                  }}
                  className="text-blue-600 hover:text-blue-700 text-xs sm:text-sm font-medium"
                >
                  {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-500 mt-4 sm:mt-6 text-[11px] sm:text-xs">
          Crisis support available 24/7 — call 988 or 911 for emergencies
        </p>
      </div>
    </div>
  );
}
