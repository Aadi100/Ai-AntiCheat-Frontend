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

  const nextUrl = searchParams.get('next') || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      navigate(nextUrl);
    } else {
      setStatus(result.message);
    }
  };

  return (
    <div className="login-card-wrap">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-logo">
          <div className="logo-mark">
            <div style={{ background: '#7c6cf0', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '15px', height: '100%' }}>
              A
            </div>
          </div>
          <div>
            <div className="brand">FitnessMarvel Ai AntiCheat</div>
            <div className="sub">Sign in to continue</div>
          </div>
        </div>

        {status && <div className="login-status">{status}</div>}

        <div className="login-field">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        <button type="submit" className="login-submit">Sign in</button>
        <p className="text-muted" style={{ marginTop: '12px', textAlign: 'center', fontSize: '11px' }}>
          Hint: Any username, password: <b>admin</b>
        </p>
      </form>
    </div>
  );
};
export default Login;
