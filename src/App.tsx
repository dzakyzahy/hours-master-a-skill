import React, { useEffect, Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { App as CapApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';
import { usePresence } from './hooks/usePresence';
import { useFriendRequests } from './hooks/useFriendRequests';
import './index.css';

const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Chat = lazy(() => import('./pages/Chat').then(m => ({ default: m.Chat })));
const MeetingRoom = lazy(() => import('./pages/MeetingRoom').then(m => ({ default: m.MeetingRoom })));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh' }}>
      <div 
        className="animate-spin" 
        style={{ 
          width: '32px', 
          height: '32px', 
          border: '3px solid var(--border-color)', 
          borderTopColor: 'var(--accent-primary)', 
          borderRadius: '50%' 
        }} 
      />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { theme } = useStore();
  usePresence();
  useFriendRequests();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Native Capacitor Integration (Android Back Button & Status Bar)
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: theme === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
      StatusBar.setBackgroundColor({ color: theme === 'dark' ? '#090d16' : '#f8fafc' }).catch(() => {});

      const backListener = CapApp.addListener('backButton', () => {
        const hash = window.location.hash;
        if (hash && hash !== '#/' && hash !== '#/login') {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });

      return () => {
        backListener.then((l: any) => l.remove()).catch(() => {});
      };
    }
  }, [theme]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', position: 'relative', overflow: 'hidden' }}>
      <HashRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/chat" 
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/meeting/:roomId?" 
              element={
                <ProtectedRoute>
                  <MeetingRoom />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </Suspense>
      </HashRouter>
    </div>
  );
}
