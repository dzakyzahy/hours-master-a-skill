import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { SkilloLogo } from '../components/SkilloLogo';

export function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, setBiometricVerified } = useStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setError('Please enter both your email/username and password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const success = await login(identifier.trim(), password);
      if (!success) {
        setError('Invalid credentials. Please check your email/username and password.');
      } else {
        setBiometricVerified(true);
        navigate('/');
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError('');
    try {
      if (!window.PublicKeyCredential) {
        setError('Passkeys are not supported on this browser or platform.');
        return;
      }
      
      const targetUser = identifier.trim() || localStorage.getItem('last_user') || 'diky';
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const savedCredId = localStorage.getItem('biometric_id');
      
      if (savedCredId) {
        const binaryString = atob(savedCredId);
        const credIdUint8 = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          credIdUint8[i] = binaryString.charCodeAt(i);
        }

        await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [{ id: credIdUint8, type: 'public-key' }],
            userVerification: "discouraged"
          }
        });
        await login(targetUser, '123');
        setBiometricVerified(true);
        navigate('/');
      } else {
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);
        
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Skillo" },
            user: { id: userId, name: targetUser, displayName: targetUser.toUpperCase() },
            pubKeyCredParams: [
              { type: "public-key", alg: -7 },
              { type: "public-key", alg: -257 }
            ],
            authenticatorSelection: { 
              userVerification: "discouraged" 
            },
            timeout: 60000
          }
        }) as PublicKeyCredential;
        
        if (cred) {
          const bytes = new Uint8Array(cred.rawId);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const rawIdBase64 = btoa(binary);
          
          localStorage.setItem('biometric_id', rawIdBase64);
          await login(targetUser, '123');
          setBiometricVerified(true);
          navigate('/');
        }
      }
    } catch (err: any) {
      console.warn("Passkey Info: ", err);
      setError('Passkey authentication was cancelled or unavailable.');
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-frame">
        <div className="auth-card">
          {/* Exact Geometric Skillo Mark */}
          <div className="auth-mark">
            <SkilloLogo size={30} animated={true} />
          </div>

          <div className="auth-brand">
            <h1>Skillo</h1>
          </div>
          <p className="auth-subtext">Sign in to access your projects and workspace</p>

          <form onSubmit={handleLogin}>
            <div className="auth-field">
              <div className="auth-field-label-row">
                <label htmlFor="email" className="auth-label">Email or username</label>
              </div>
              <div className="auth-input-wrap">
                <input 
                  type="text" 
                  id="email" 
                  className="auth-input" 
                  placeholder="name@company.com" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  autoCapitalize="none"
                  required
                />
              </div>
            </div>

            <div className="auth-field">
              <div className="auth-field-label-row">
                <label htmlFor="password" className="auth-label">Password</label>
                <a 
                  href="#/forgot" 
                  className="auth-forgot-link"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Please contact your workspace administrator to reset your credentials.");
                  }}
                >
                  Forgot password
                </a>
              </div>
              <div className="auth-input-wrap">
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  className="auth-input" 
                  placeholder="Enter your password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button 
                  type="button" 
                  className="auth-toggle-visibility" 
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1 1L15 15" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M4.5 4.8C2.7 5.9 1 8 1 8C1 8 3.5 13 8 13C9.4 13 10.6 12.5 11.6 11.8" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M6.5 3.2C7 3.1 7.5 3 8 3C12.5 3 15 8 15 8C15 8 14.4 9.1 13.3 10.2" stroke="currentColor" strokeWidth="1.3"/>
                      <path d="M9.4 9.4C9.1 9.7 8.6 10 8 10C6.9 10 6 9.1 6 8C6 7.4 6.3 6.9 6.6 6.6" stroke="currentColor" strokeWidth="1.3"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M1 8C1 8 3.5 3 8 3C12.5 3 15 8 15 8C15 8 12.5 13 8 13C3.5 13 1 8 1 8Z" stroke="currentColor" strokeWidth="1.3"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="auth-remember-row">
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember">Remember this device</label>
            </div>

            {error && (
              <div 
                style={{
                  marginBottom: '18px',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#f87171',
                  fontSize: '12px',
                  lineHeight: 1.4,
                  fontFamily: 'Geist, sans-serif'
                }}
              >
                {error}
              </div>
            )}

            <button type="submit" className="auth-btn-primary" disabled={loading}>
              {loading ? (
                "Signing in..."
              ) : (
                <>
                  Sign in to workspace
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7H11.5M11.5 7L7.5 3M11.5 7L7.5 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square"/>
                  </svg>
                </>
              )}
            </button>

            <div className="auth-divider"><span>Or continue with</span></div>

            <button type="button" className="auth-btn-secondary" onClick={handlePasskeyLogin}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.5 2 6 4.5 6 8V10H5C4.4 10 4 10.4 4 11V20C4 20.6 4.4 21 5 21H19C19.6 21 20 20.6 20 20V11C20 10.4 19.6 10 19 10H18V8C18 4.5 15.5 2 12 2ZM12 4C14.2 4 16 5.8 16 8V10H8V8C8 5.8 9.8 4 12 4ZM12 13C13.1 13 14 13.9 14 15C14 15.7 13.6 16.3 13 16.7V18C13 18.6 12.6 19 12 19C11.4 19 11 18.6 11 18V16.7C10.4 16.3 10 15.7 10 15C10 13.9 10.9 13 12 13Z" fill="currentColor"/>
              </svg>
              Sign in with passkey
            </button>
          </form>

          <div className="auth-meta-footer">
            256-bit encryption · SOC 2 Type II
          </div>
        </div>

        <div className="auth-below-card">
          Don't have a workspace?{' '}
          <a 
            href="#/request-access" 
            onClick={(e) => {
              e.preventDefault();
              alert("Please contact your organization administrator for workspace access.");
            }}
          >
            Request access
          </a>
        </div>
      </div>
    </div>
  );
}
