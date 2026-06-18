import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, User, CheckCircle, Shield } from 'lucide-react';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import LogoDisplay from '../../components/ui/LogoDisplay';
import { useSystemConfigContext } from '../../contexts/SystemConfigContext';
import toast from 'react-hot-toast';

const ClientForgotPasswordPage: React.FC = () => {
  const { getPrimaryLogo } = useSystemConfigContext();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');

  const isEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const value = input.trim();

    if (!value) {
      setError('Please enter your username or email address');
      return;
    }

    setLoading(true);
    try {
      let email = value;

      if (!isEmail(value)) {
        // Look up email by username
        const q = query(
          collection(db, 'users'),
          where('username', '==', value),
          limit(1)
        );
        const snap = await getDocs(q);

        if (snap.empty) {
          // Also try users_public collection
          const q2 = query(
            collection(db, 'users_public'),
            where('username', '==', value),
            limit(1)
          );
          const snap2 = await getDocs(q2);

          if (snap2.empty) {
            setError('Username not found. Please check your username or contact bank support.');
            setLoading(false);
            return;
          }
          email = snap2.docs[0].data().email;
        } else {
          email = snap.docs[0].data().email;
        }
      }

      await sendPasswordResetEmail(auth, email);
      setSentTo(email);
      setSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError('No account found with that email. Please contact bank support.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h2>
            <p className="text-gray-600 mb-6">
              We sent a password reset link to <strong>{sentTo}</strong>
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left mb-6">
              <h4 className="text-sm font-medium text-green-800 mb-2">Next steps:</h4>
              <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
                <li>Check your inbox (and spam folder)</li>
                <li>Click the "Reset Password" link in the email</li>
                <li>Create a new strong password</li>
                <li>Sign in with your new password</li>
              </ol>
            </div>
            <p className="text-xs text-gray-500 mb-6">The link expires in 1 hour for security reasons.</p>
            <button
              onClick={() => { setSent(false); setInput(''); setSentTo(''); }}
              className="text-sm text-green-600 hover:text-green-800 underline mr-4"
            >
              Try again
            </button>
            <Link to="/client-login" className="text-sm text-gray-600 hover:text-gray-800 underline">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="w-full max-w-xs">
            <LogoDisplay
              logoUrl={getPrimaryLogo()}
              companyName=""
              fallbackIcon={<Shield className="w-12 h-12 text-green-600" />}
              className="w-full h-20 object-contain"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Forgot Password?</h2>
            <p className="text-sm text-gray-600 mt-1">
              Enter your username or email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username or Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {isEmail(input) ? (
                    <Mail className="h-5 w-5 text-gray-400" />
                  ) : (
                    <User className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError(''); }}
                  className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${error ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                  placeholder="e.g. john_doe or john@example.com"
                  autoFocus
                />
              </div>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  A secure reset link will be sent to the email associated with your account. The link expires in 1 hour.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-full bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending Reset Link...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/client-login"
              className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Don't have an account? Contact bank support for assistance.
        </p>
      </div>
    </div>
  );
};

export default ClientForgotPasswordPage;
