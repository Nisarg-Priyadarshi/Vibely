import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login = () => {
  const { user, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
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
        width: googleButtonRef.current.offsetWidth || 400,
        text: 'continue_with',
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

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setServerError(null);

    const result = await login({
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
    <div className="flex-1 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Decorative backdrop glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              Welcome Back
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Log in to Vibely
            </h1>
            <p className="text-xs text-[#999999]">
              Access your library, playlists, and synchronized listening rooms
            </p>
          </div>

          {serverError && (
            <div className="p-3.5 rounded-[4px] bg-rose-950/40 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#cccccc]">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2.5 rounded-[4px] bg-[#222222] border text-[#ffffff] placeholder-[#666666] text-xs focus:outline-none transition-colors ${validationErrors.email
                      ? 'border-rose-500/60'
                      : 'border-[rgba(255,255,255,0.08)] focus:border-[rgba(255,255,255,0.3)]'
                    }`}
                />
              </div>
              {validationErrors.email && (
                <p className="text-[11px] text-rose-400 pl-1">{validationErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#cccccc]">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  disabled={submitting}
                  className={`w-full px-3.5 py-2.5 rounded-[4px] bg-[#222222] border text-[#ffffff] placeholder-[#666666] text-xs focus:outline-none transition-colors ${validationErrors.password
                      ? 'border-rose-500/60'
                      : 'border-[rgba(255,255,255,0.08)] focus:border-[rgba(255,255,255,0.3)]'
                    }`}
                />
              </div>
              {validationErrors.password && (
                <p className="text-[11px] text-rose-400 pl-1">{validationErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 btn-white py-2.5 text-xs font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          </form>

          {/* Google Sign-In */}
          <div className="space-y-3 pt-2">
            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
              <span className="text-[11px] text-[#777777] font-medium">or continue with</span>
              <div className="flex-1 h-px bg-[rgba(255,255,255,0.08)]" />
            </div>
            <div ref={googleButtonRef} className="w-full flex justify-center overflow-hidden rounded-[4px]" />
          </div>

          <div className="text-center pt-2 border-t border-[rgba(255,255,255,0.08)]">
            <p className="text-xs text-[#999999]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#ffffff] hover:underline font-semibold">
                Create one now
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
