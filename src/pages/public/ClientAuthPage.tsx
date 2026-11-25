import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, LogOut, Mail, ShieldCheck, User as UserIcon } from 'lucide-react';
import { PublicLayout } from '../../components/layout/PublicLayout';
import { useClientAuth } from '../../context/ClientAuthContext';

function formatAuthError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('auth/operation-not-allowed')) {
    return 'Email/Password sign-in is not yet enabled in Firebase Console → Authentication → Sign-in method.';
  }
  if (msg.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
    return 'Invalid email or password. Please check and try again.';
  }
  if (msg.includes('auth/weak-password')) {
    return 'Password should be at least 6 characters.';
  }
  if (msg.includes('auth/popup-closed-by-user')) {
    return 'Google sign-in popup was closed before completing.';
  }
  return 'Authentication failed. Please verify your details and try again.';
}

export function ClientAuthPage() {
  const {
    clientUser,
    authReady,
    savedPhone,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resendVerification,
    savePhone,
    signOutClient,
  } = useClientAuth();

  const [params] = useSearchParams();
  const navigate = useNavigate();
  const nextPath = params.get('redirect') || '';

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (savedPhone) setPhone(savedPhone);
  }, [savedPhone]);

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await signInWithGoogle();
      if (nextPath) navigate(nextPath);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
        if (nextPath) navigate(nextPath);
      } else {
        await signUpWithEmail(fullName, email, password);
        setNotice('Account created! We sent a verification link to your email address.');
      }
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    try {
      await savePhone(phone);
      setNotice('Contact number saved to your profile.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save phone');
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-14">
        {!authReady ? (
          <div className="h-80 rounded-2xl bg-white border border-[#E2E8F0] animate-pulse" />
        ) : clientUser ? (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-7 sm:p-8 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] space-y-6">
            <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center font-display font-bold text-lg shrink-0">
                  {(clientUser.displayName || clientUser.email || 'T')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h1 className="font-display text-xl font-bold text-[#0F172A] truncate">
                    {clientUser.displayName || 'TravelGo Member'}
                  </h1>
                  <p className="text-xs text-[#64748B] truncate">{clientUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={signOutClient}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-[#E2E8F0] text-xs font-semibold text-[#475569] hover:text-red-600 shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>

            {!clientUser.emailVerified && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-2">
                <p className="font-semibold">Verify your email to sync your saved profile across devices.</p>
                <button
                  type="button"
                  onClick={async () => {
                    await resendVerification();
                    setNotice('Verification email sent! Check your inbox and refresh after clicking the link.');
                  }}
                  className="text-[#0F766E] font-semibold hover:underline"
                >
                  Resend Verification Email
                </button>
              </div>
            )}

            {notice && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSavePhone} className="space-y-3">
              <label className="block text-xs font-semibold text-[#475569]">Saved WhatsApp / Mobile Number</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98114 20750"
                  className="flex-1 h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm tabular-nums focus:outline-none focus:border-[#0F766E]"
                />
                <button
                  type="submit"
                  className="px-5 rounded-full bg-[#0F766E] hover:bg-[#115E59] text-white text-xs font-semibold"
                >
                  Save
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                to="/booking"
                className="text-center rounded-full bg-[#F97316] hover:bg-[#EA580C] text-white text-sm font-semibold py-3 transition-colors"
              >
                New Booking Request
              </Link>
              <Link
                to="/reviews"
                className="text-center rounded-full border border-[#E2E8F0] hover:border-[#0F766E] text-[#0F172A] text-sm font-semibold py-3 transition-colors"
              >
                Write a Review
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-[#E2E8F0] p-7 sm:p-8 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
            <div className="text-center mb-6">
              <div className="w-11 h-11 rounded-full bg-[#CCFBF1] text-[#0F766E] flex items-center justify-center mx-auto mb-3">
                <UserIcon className="w-5 h-5" />
              </div>
              <h1 className="font-display text-2xl font-bold text-[#0F172A]">
                {mode === 'signin' ? 'Traveller Sign In' : 'Create Traveller Account'}
              </h1>
              <p className="text-xs text-[#64748B] mt-1">
                Sign in with Google or email to auto-fill bookings and share verified trip reviews.
              </p>
            </div>

            {/* Segmented Mode Switch */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setNotice(null);
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'signin' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-[#64748B]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setNotice(null);
                }}
                className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'signup' ? 'bg-white text-[#0F766E] shadow-sm' : 'text-[#64748B]'
                }`}
              >
                Sign Up
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {notice && (
              <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{notice}</span>
              </div>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={handleGoogle}
              className="w-full h-12 rounded-full border border-[#E2E8F0] hover:border-[#0F766E] bg-white text-[#0F172A] font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors mb-5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex items-center justify-center my-5">
              <div className="border-t border-[#E2E8F0] w-full" />
              <span className="bg-white px-3 text-[11px] font-medium text-[#64748B] whitespace-nowrap">
                or with email &amp; password
              </span>
              <div className="border-t border-[#E2E8F0] w-full" />
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Aarav Sharma"
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 text-white font-semibold text-sm py-3.5 transition-colors"
              >
                {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In with Email' : 'Create Account'}
              </button>
            </form>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#64748B]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0F766E]" />
              <span>Secured by Firebase Authentication</span>
            </p>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
