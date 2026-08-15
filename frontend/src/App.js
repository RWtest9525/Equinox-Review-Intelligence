import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import AppLayout from "@/components/layout/AppLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Reviews from "@/pages/Reviews";
import RatingAnalytics from "@/pages/RatingAnalytics";
import Sentiment from "@/pages/Sentiment";
import Topics from "@/pages/Topics";
import AIInsights from "@/pages/AIInsights";
import LiveReviews from "@/pages/LiveReviews";
import Competitors from "@/pages/Competitors";
import CompetitorReviews from "@/pages/CompetitorReviews";
import Benchmarking from "@/pages/Benchmarking";
import AIReplyCenter from "@/pages/AIReplyCenter";
import AIIntelligence from "@/pages/AIIntelligence";
import Reports from "@/pages/Reports";
import Applications from "@/pages/Applications";
import Clients from "@/pages/Clients";
import Team from "@/pages/Team";
import Integrations from "@/pages/Integrations";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null)
    return (
      <div className="grid min-h-screen place-items-center bg-[#0A0A0B]">
        <Loader2 className="animate-spin text-blue-500" size={28} />
      </div>
    );
  if (user === false) return <Navigate to="/login" replace />;
  return children;
}

function RoleRoute({ roles, children }) {
  const { user } = useAuth();
  if (user && user !== false && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <div className="App">
      <Toaster theme="dark" position="top-right" richColors />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <Protected>
                  <AppLayout />
                </Protected>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/reviews" element={<Reviews />} />
              <Route path="/rating-analytics" element={<RatingAnalytics />} />
              <Route path="/sentiment" element={<Sentiment />} />
              <Route path="/topics" element={<Topics />} />
              <Route path="/ai-insights" element={<AIInsights />} />
              <Route path="/live-reviews" element={<LiveReviews />} />
              <Route path="/competitors" element={<Competitors />} />
              <Route path="/competitor-reviews" element={<CompetitorReviews />} />
              <Route path="/benchmarking" element={<Benchmarking />} />
              <Route path="/ai-reply" element={<AIReplyCenter />} />
              <Route path="/ai-intelligence" element={<AIIntelligence />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/scheduled-reports" element={<Reports scheduled />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/clients" element={<RoleRoute roles={["super_admin"]}><Clients /></RoleRoute>} />
              <Route path="/team" element={<RoleRoute roles={["super_admin", "client_admin"]}><Team /></RoleRoute>} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
