import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Fingerprint } from 'lucide-react';
import { useStore } from '../store';
import logoMark from '../assets/logo.svg';

export function Login() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const { login, setBiometricVerified } = useStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login(user, pass);
    if (!success) {
      setError('Invalid username or password');
    } else {
      setBiometricVerified(true);
      navigate('/');
    }
  };

  const handleFingerprint = async () => {
    try {
      if (!window.PublicKeyCredential) {
         alert('Biometrics not supported on this device/browser.');
         return;
      }
      
      const challenge = new Uint8Array(32);
      window.crypto.getRandomValues(challenge);

      const savedCredId = localStorage.getItem('biometric_id');
      
      if (savedCredId) {
        // Safe Base64 to Uint8Array
        const binaryString = atob(savedCredId);
        const credIdUint8 = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          credIdUint8[i] = binaryString.charCodeAt(i);
        }

        await navigator.credentials.get({
          publicKey: {
            challenge,
            allowCredentials: [{ id: credIdUint8, type: 'public-key' }],
            userVerification: "discouraged" // Maximize compatibility
          }
        });
        await login('zahy', '123');
        setBiometricVerified(true);
        navigate('/');
      } else {
        const userId = new Uint8Array(16);
        window.crypto.getRandomValues(userId);
        
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: "Hours Master" }, // Removing explicit ID forces browser to safely infer it
            user: { id: userId, name: "zahy", displayName: "Zahy" },
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
          // Safe Uint8Array to Base64
          const bytes = new Uint8Array(cred.rawId);
          let binary = '';
          for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const rawIdBase64 = btoa(binary);
          
          localStorage.setItem('biometric_id', rawIdBase64);
          await login('zahy', '123');
          setBiometricVerified(true);
          navigate('/');
        }
      }
    } catch (err: any) {
      console.error("WebAuthn Error: ", err);
      // Clear potentially corrupted passkey data
      localStorage.removeItem('biometric_id');
      setError(`Passkey Error: ${err.message || 'Operation failed'}. Please use password.`);
    }
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card no-drag" style={{ position: 'relative', zIndex: 10 }}>
        <div className="flex flex-col items-center mb-6">
          <img 
            src={logoMark} 
            alt="Hours Master" 
            style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '16px', 
              marginBottom: '16px', 
              boxShadow: '0 8px 24px -4px rgba(0, 229, 255, 0.25)' 
            }} 
          />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', margin: '0 0 6px 0' }}>Hours <span className="text-cyan">Master</span></h2>
          <p className="text-muted" style={{ margin: 0, fontSize: '0.9375rem' }}>Track your mastery journey</p>
        </div>
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-muted mb-2 block font-semibold text-sm">Username</label>
            <input type="text" className="input-field" value={user} onChange={e => setUser(e.target.value)} />
          </div>
          <div>
            <label className="text-muted mb-2 block font-semibold text-sm">Password</label>
            <input type="password" className="input-field" value={pass} onChange={e => setPass(e.target.value)} />
          </div>
          {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '14px' }}>{error}</p>}
          <div className="flex gap-2 mt-4">
            <button type="submit" className="btn btn-primary flex-1">
              <LogIn size={18} /> Login
            </button>
            <button type="button" className="btn" onClick={handleFingerprint} title="Login with Fingerprint/Windows Hello">
              <Fingerprint size={18} className="text-cyan" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
