import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import './game/game.css'
import App from './App.tsx'
import {
  OnboardingPage,
  DashboardPage,
  TrainingPage,
  JutsuTreePage,
  AcademyGuidePage,
  ExamPage,
  MissionsPage,
  ClanHallPage,
  useGameStore,
} from './game'

function AppRouter() {
  const profile = useGameStore((s) => s.profile);
  const hasProfile = profile !== null;

  return (
    <Routes>
      {/* Onboarding — shown when no profile exists */}
      <Route
        path="/"
        element={hasProfile ? <Navigate to="/dashboard" replace /> : <OnboardingPage />}
      />
      <Route
        path="/onboarding"
        element={hasProfile ? <Navigate to="/dashboard" replace /> : <OnboardingPage />}
      />

      {/* Game pages — require profile */}
      <Route
        path="/dashboard"
        element={hasProfile ? <DashboardPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/training"
        element={hasProfile ? <TrainingPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/jutsu"
        element={hasProfile ? <JutsuTreePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/academy"
        element={hasProfile ? <AcademyGuidePage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/exam"
        element={hasProfile ? <ExamPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/missions"
        element={hasProfile ? <MissionsPage /> : <Navigate to="/" replace />}
      />
      <Route
        path="/clan"
        element={hasProfile ? <ClanHallPage /> : <Navigate to="/" replace />}
      />

      {/* Live camera training session (original App) */}
      <Route path="/play" element={<App />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  </StrictMode>,
)
