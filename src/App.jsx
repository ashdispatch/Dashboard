import React, { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore';
import Login from './pages/Login';
import { Loader2 } from 'lucide-react';

const Overview = lazy(() => import('./pages/Overview'));
const DatUsers = lazy(() => import('./pages/DatUsers'));
const Dialers = lazy(() => import('./pages/Dialers'));
const SystemSummary = lazy(() => import('./pages/SystemSummary'));

const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] gap-4">
    <Loader2 size={36} className="animate-spin text-[var(--accent-primary)]" />
    <p className="font-mono text-sm text-[var(--text-muted)] uppercase tracking-widest">Loading Dashboard...</p>
  </div>
);

const PageLoader = () => (
  <div className="flex h-[50vh] items-center justify-center">
    <div className="animate-pulse flex space-x-2">
      {[0,1,2].map(i => <div key={i} className="rounded-full bg-[var(--accent-primary)] h-2.5 w-2.5" />)}
    </div>
  </div>
);

function App() {
  const { isAuthenticated, authLoading, initAuth, setInitialTheme } = useStore();

  useEffect(() => {
    setInitialTheme();
    initAuth();
  }, []);

  // Show full-screen loader while checking session
  if (authLoading) return <LoadingScreen />;

  if (!isAuthenticated) {
    return (
      <AnimatePresence mode="wait">
        <Login />
      </AnimatePresence>
    );
  }

  return (
    <MainLayout>
      <Suspense fallback={<PageLoader />}>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/"        element={<Overview />} />
            <Route path="/dat"     element={<DatUsers />} />
            <Route path="/dialers" element={<Dialers />} />
            <Route path="/summary" element={<SystemSummary />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </MainLayout>
  );
}

export default App;
