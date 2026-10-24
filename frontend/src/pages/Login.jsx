import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
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
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'filled_black',
        size: 'large',
        width: googleButtonRef.current.offsetWidth || 380,
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
    <div className="flex-1 flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] p-8 sm:p-10 shadow-2xl relative">
        <div className="space-y-6">
          <div className="text-center space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#00e599]">
              Authentication
            </div>
            <h1 className="text-2xl sm:text-3xl font-extralight text-[#ffffff] tracking-tight">
              Sign In to Vibely
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
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                disabled={submitting}
                className={`w-full input-flat text-xs py-2.5 ${
                  validationErrors.email ? 'border-rose-500/60' : ''
                }`}
              />
              {validationErrors.email && (
                <p className="text-[11px] text-rose-400 pl-1">{validationErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#cccccc]">
                Password
              </label>
              <input
                type="password"
                name="password"
                id="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                disabled={submitting}
                className={`w-full input-flat text-xs py-2.5 ${
                  validationErrors.password ? 'border-rose-500/60' : ''
                }`}
              />
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
