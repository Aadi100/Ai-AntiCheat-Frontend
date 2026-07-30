import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const Login = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const nextUrl = searchParams.get('next') || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus('');
    try {
      const result = await login(username, password);
      if (result.success) {
        navigate(nextUrl);
      } else {
        setStatus(result.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="hero-body">
      {/* Decorative Grid Sweeper — shared brand hero, same as the splash screen */}
      <div className="hud-grid"></div>
      <div className="scan-sweep"></div>

      {/* Corner Brackets */}
      <div className="corner corner-tl"></div>
      <div className="corner corner-tr"></div>
      <div className="corner corner-bl"></div>
      <div className="corner corner-br"></div>

      {/* Particle HUD Floating Dots */}
      <div className="particles">
        <div className="particle" style={{ left: '12%', bottom: '18%', width: '4px', height: '4px', animationDuration: '6.5s', animationDelay: '.2s' }}></div>
        <div className="particle" style={{ left: '22%', bottom: '8%', width: '3px', height: '3px', animationDuration: '7.8s', animationDelay: '1.4s' }}></div>
        <div className="particle" style={{ left: '80%', bottom: '20%', width: '5px', height: '5px', animationDuration: '6.9s', animationDelay: '.4s' }}></div>
        <div className="particle" style={{ left: '88%', bottom: '6%', width: '3px', height: '3px', animationDuration: '8.8s', animationDelay: '2.6s' }}></div>
        <div className="particle" style={{ left: '6%', bottom: '34%', width: '3px', height: '3px', animationDuration: '7.4s', animationDelay: '1.1s' }}></div>
        <div className="particle" style={{ left: '93%', bottom: '32%', width: '4px', height: '4px', animationDuration: '6.7s', animationDelay: '1.7s' }}></div>
      </div>

      <div className="hero-content">
        {/* Brand Header */}
        <div className="lockup">
          <div className="badge-orbit">
            <div className="logo-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5b7cfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
          </div>
          <div className="wordmark">Fitness Marvel</div>
        </div>

        <div className="eyebrow"><span className="dot"></span>AI-Powered Anti-Cheat Security</div>

        <div className="login-card-wrap">
          <form className="login-card" onSubmit={handleSubmit}>
            <div className="login-logo">
              <div className="brand">Sign in to your workspace</div>
              <div className="sub">Enter your credentials to access the dashboard</div>
            </div>

            {status && <div className="login-status">⚠️ {status}</div>}

            <div className="login-field">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                placeholder="you@company.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="login-submit" disabled={submitting} style={submitting ? { opacity: .8, cursor: 'wait', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' } : undefined}>
              {submitting ? (<><span className="spinner"></span> Signing in…</>) : 'Sign in'}
            </button>

            <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '10.5px', color: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
              🔒 Secured connection · Enterprise SSO available on request
            </p>
          </form>
        </div>
      </div>

      <div className="hero-footer">&copy; 2026 FITNESS MARVEL</div>
    </div>
  );
};
export default Login;
