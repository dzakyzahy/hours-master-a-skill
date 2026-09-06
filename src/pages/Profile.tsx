import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Save, ArrowLeft, Key } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useStore } from '../store';

export function Profile() {
  const { username, logout } = useStore();
  const navigate = useNavigate();
  const [newUsername, setNewUsername] = useState(username);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        setEmail(authData.user.email || '');
        const { data } = await supabase.from('profiles').select('username').eq('id', authData.user.id).single();
        if (data) setNewUsername(data.username);
      }
    }
    loadProfile();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) throw new Error("Not logged in");

      // Update email or password via Auth API
      const updates: any = {};
      if (email && email !== authData.user.email) updates.email = email;
      if (password) updates.password = password;

      if (Object.keys(updates).length > 0) {
        const { error: authError } = await supabase.auth.updateUser(updates);
        if (authError) throw authError;
      }

      // Update Username via DB
      if (newUsername && newUsername !== username) {
        const { error: dbError } = await supabase
          .from('profiles')
          .update({ username: newUsername })
          .eq('id', authData.user.id);
        if (dbError) throw dbError;
        useStore.setState({ username: newUsername });
      }

      setMsg('Profile updated successfully! (Check email if changed)');
      setPassword('');
    } catch (error: any) {
      setMsg(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px', flex: 1 }} className="no-drag">
      <div className="flex items-center mb-8 gap-4">
        <button className="btn" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <h1 style={{ margin: 0 }}>Profile Settings</h1>
      </div>

      <div className="glass-panel" style={{ maxWidth: '500px' }}>
        <form onSubmit={handleUpdate} className="flex flex-col gap-4">
          <div>
            <label className="text-muted mb-2 block font-semibold text-sm">Username</label>
            <div className="flex gap-2">
              <User className="text-muted mt-2" size={20} />
              <input type="text" className="input-field" value={newUsername} onChange={e => setNewUsername(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-muted mb-2 block font-semibold text-sm">Email</label>
            <div className="flex gap-2">
              <Mail className="text-muted mt-2" size={20} />
              <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-muted mb-2 block font-semibold text-sm">New Password (leave blank to keep current)</label>
            <div className="flex gap-2">
              <Key className="text-muted mt-2" size={20} />
              <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          
          {msg && <p className={`text-sm ${msg.includes('Error') ? 'text-red-500' : 'text-green-500'}`}>{msg}</p>}

          <button type="submit" className="btn btn-primary mt-4 flex justify-center" disabled={loading}>
            {loading ? 'Saving...' : <><Save size={18} className="mr-2" /> Save Changes</>}
          </button>
        </form>
      </div>
    </div>
  );
}
