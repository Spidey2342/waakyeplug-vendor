import { useState } from 'react';
import { Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { toastError } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    try {
      const result = await login(email, password);
      if (!result.success) toastError(result.message || 'Could not sign in.');
    } finally {
      setLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-orange-600 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck className="text-white" size={26} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Waakye Plug <span className="text-orange-600">Admin</span></h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to manage vendors and orders</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loggingIn}
            className="w-full bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold py-3 rounded-full transition"
          >
            {loggingIn ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}