import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, User, Mail, Lock, AlertCircle, ArrowRight, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Register = () => {
  const { user, register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Mount Google Sign-In button
  useEffect(() => {
    const tryRender = () => {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          const result = await loginWithGoogle(credential);
          if (result.success) navigate('/');
          else setServerError(result.error);
        },
      });
      const containerWidth = googleButtonRef.current?.offsetWidth || (window.innerWidth - 64);
      const targetWidth = Math.min(Math.max(containerWidth, 200), 380);
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: targetWidth,
        text: 'signup_with',
        shape: 'rectangular',
      });
    };
    const interval = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(interval);
        tryRender();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [loginWithGoogle, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev) => ({ ...prev, [name]: null }));
    }
    setServerError(null);
  };

  const validate = () => {
    const errors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });

    setSubmitting(false);

    if (result.success) {
      navigate('/');
    } else {
      setServerError(result.error);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <Link to="/" className="inline-block group focus:outline-none mb-1" title="Vibely — Home">
              <img
                src="/vibely-logo.png"
                alt="Vibely logo"
                className="w-14 h-14 mx-auto rounded-2xl shadow-xl shadow-emerald-500/10 border border-slate-800/80 group-hover:scale-105 transition-transform object-contain"
              />
            </Link>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                Join the Vibe
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Create an account
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Start streaming and listening with friends in real-time
            </p>
          </div>

          {serverError && (
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Alex Rivers"
                  disabled={submitting}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 transition-all ${
                    validationErrors.name
                      ? 'border-rose-500/60 focus:ring-rose-500/40'
                      : 'border-slate-800 focus:border-emerald-500/80 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
              {validationErrors.name && (
                <p className="text-[11px] text-rose-400 pl-1">{validationErrors.name}</p>
              )}
            </div>

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="alex@example.com"
                  disabled={submitting}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 transition-all ${
                    validationErrors.email
                      ? 'border-rose-500/60 focus:ring-rose-500/40'
                      : 'border-slate-800 focus:border-emerald-500/80 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
              {validationErrors.email && (
                <p className="text-[11px] text-rose-400 pl-1">{validationErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="At least 6 characters"
                  disabled={submitting}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 transition-all ${
                    validationErrors.password
                      ? 'border-rose-500/60 focus:ring-rose-500/40'
                      : 'border-slate-800 focus:border-emerald-500/80 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
              {validationErrors.password && (
                <p className="text-[11px] text-rose-400 pl-1">{validationErrors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repeat your password"
                  disabled={submitting}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 transition-all ${
                    validationErrors.confirmPassword
                      ? 'border-rose-500/60 focus:ring-rose-500/40'
                      : 'border-slate-800 focus:border-emerald-500/80 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
              {validationErrors.confirmPassword && (
                <p className="text-[11px] text-rose-400 pl-1">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-3 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all duration-150 disabled:opacity-60 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-800/60">
            <p className="text-xs text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-2">
                Log in instead
              </Link>
            </p>
          </div>

          {/* Google Sign-Up */}
          <div className="space-y-3">
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-800" />
              <span className="text-[11px] text-slate-500 font-medium">or continue with</span>
              <div className="flex-1 h-px bg-slate-800" />
            </div>
            <div ref={googleButtonRef} className="w-full flex justify-center overflow-hidden rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
