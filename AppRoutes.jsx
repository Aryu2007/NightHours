import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Footer from './components/Footer';
import Navbar from './components/Navbar';
import MemoryMatch from './games/MemoryMatch';
import TypeSprint from './games/TypeSprint';
import MathQuest from './games/MathQuest';
import NightArena from './pages/NightArena';
import QuizRush from './games/QuizRush';
import QuizBattle from './games/QuizBattle';
import PatternRecall from './games/PatternRecall';
import Home from './pages/Home';
import Profile from './pages/Profile';
import PlaceholderPage from './pages/PlaceholderPage';
import LoginPage from './pages/Auth/LoginPage';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <div className="site-shell">
      <ScrollToTop />
      <Navbar />
      <main id="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/learning" element={<MemoryMatch />} />
          <Route path="/learning/typesprint" element={<TypeSprint />} />
          <Route path="/learning/mathquest" element={<MathQuest />} />
          <Route path="/rising" element={<QuizRush />} />
          <Route path="/rising/battle" element={<QuizBattle />} />
          <Route path="/arena" element={<NightArena />} />
          <Route path="/golden" element={<PatternRecall />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route
            path="/login"
            element={<ProtectedRoute requireAuth={false}><LoginPage /></ProtectedRoute>}
          />
          <Route path="*" element={<PlaceholderPage title="Page not found" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default AppRoutes;
