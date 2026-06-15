import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { isAuthenticated } from "./lib/api";
import LoginPage from "./pages/LoginPage";
import SurveyListPage from "./pages/SurveyListPage";
import SurveyBuilderPage from "./pages/SurveyBuilderPage";
import SurveyDetailPage from "./pages/SurveyDetailPage";
import PublicSurveyPage from "./pages/PublicSurveyPage";
import DashboardPage from "./pages/DashboardPage";
import TutorialPage from "./pages/TutorialPage";

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14 },
      }} />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/s/:token" element={<PublicSurveyPage />} />
        <Route path="/d/:token" element={<DashboardPage />} />

        {/* Protected routes */}
        <Route path="/surveys" element={<PrivateRoute><SurveyListPage /></PrivateRoute>} />
        <Route path="/surveys/new" element={<PrivateRoute><SurveyBuilderPage /></PrivateRoute>} />
        <Route path="/surveys/:id/edit" element={<PrivateRoute><SurveyBuilderPage /></PrivateRoute>} />
        <Route path="/surveys/:id" element={<PrivateRoute><SurveyDetailPage /></PrivateRoute>} />
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        <Route path="/tutorial" element={<PrivateRoute><TutorialPage /></PrivateRoute>} />
      </Routes>
    </BrowserRouter>
  );
}
