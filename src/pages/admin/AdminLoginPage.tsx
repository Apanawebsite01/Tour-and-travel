import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function AdminLoginPage() {
  const { token, setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from || '/admin';

  const [loadingStatus, setLoadingStatus] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [fullName, setFullName] = useState('TravelGo Operations');
  const [email, setEmail] = useState('admin@travelgo.in');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) {
      navigate(redirectTo, { replace: true });
    }
  }, [token, navigate, redirectTo]);

  useEffect(() => {
    fetch('/api/admin/auth/status')
      .then((r) => r.json())
      .then((data) => {
        setConfigured(Boolean(data.configured));
        if (data.adminEmail) setEmail(data.adminEmail);
        setLoadingStatus(false);
      })
      .catch(() => setLoadingStatus(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!configured && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = configured ? '/api/admin/auth/login' : '/api/admin/auth/bootstrap';
      const body = configured ? { email, password } : { full_name: fullName, email, password };
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Authentication failed');
        setSubmitting(false);
        return;
      }
      setSession(json.token, json.admin);
      navigate(redirectTo, { replace: true });
    } catch {
      setError('Network error while authenticating');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_4px_20px_-2px_rgba(15,23,42,0.06)] p-8">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="font-display text-xl font-bold text-[#0F766E]">
            TravelGo
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B]">
            <Lock className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </span>
        </div>

        {loadingStatus ? (
          <div className="h-48 rounded-xl bg-slate-100 animate-pulse" />
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold text-[#0F172A] mb-2">
              {configured ? 'Operations Sign In' : 'Claim Admin Access'}
            </h1>
            <p className="text-sm text-[#475569] mb-6">
              {configured
                ? 'Sign in with your administrator credentials to manage fleet, bookings, and content.'
                : 'First-run setup: set your administrator password to lock and activate the operations console.'}
            </p>

            {error && (
              <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!configured && (
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Admin Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Admin Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                  {configured ? 'Password' : 'Choose Password (min 8 characters)'}
                </label>
                <input
                  type="password"
                  required
                  minLength={configured ? 1 : 8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0F766E]"
                />
              </div>

              {!configured && (
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Confirm Password</label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-[#0F766E]"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-[#0F766E] hover:bg-[#115E59] disabled:opacity-60 text-white font-semibold text-sm py-3 transition-colors"
              >
                {submitting
                  ? 'Verifying...'
                  : configured
                    ? 'Sign In to Dashboard'
                    : 'Claim Admin & Open Dashboard'}
              </button>
            </form>

            {!configured && (
              <div className="mt-5 flex items-start gap-2 text-xs text-[#64748B] bg-[#F8FAFC] p-3 rounded-xl border border-[#E2E8F0]">
                <ShieldCheck className="w-4 h-4 text-[#0F766E] shrink-0 mt-0.5" />
                <span>
                  Once claimed, public registration remains disabled and this password is hashed with scrypt on the server.
                </span>
              </div>
            )}
          </>
        )}
      </div>
      <Link to="/" className="mt-6 text-xs font-medium text-[#64748B] hover:text-[#0F766E]">
        ← Return to TravelGo Public Website
      </Link>
    </div>
  );
}
