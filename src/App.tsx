import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { NotificationProvider } from "@/context/NotificationContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProtectedRoute from "@/components/ProtectedRoute";
import Home from "@/pages/Home";
import BrowseEvents from "@/pages/BrowseEvents";
import EventDetails from "@/pages/EventDetails";
import Dashboard from "@/pages/Dashboard";
import CreateEvent from "@/pages/CreateEvent";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Profile from "@/pages/Profile";
import About from "@/pages/About";
import PaymentCallback from "@/pages/PaymentCallback";

function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      <Navbar />

      <main>
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/events"
            element={<BrowseEvents />}
          />

          <Route
            path="/events/create"
            element={
              <ProtectedRoute requireOrganizer>
                <CreateEvent />
              </ProtectedRoute>
            }
          />

          <Route
            path="/events/:slug"
            element={<EventDetails />}
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
            path="/auth"
            element={<Auth />}
          />

          <Route
            path="/auth/reset-password"
            element={<ResetPassword />}
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
            path="/about"
            element={<About />}
          />

          <Route
            path="/payment/callback"
            element={<PaymentCallback />}
          />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <AppLayout />

          <Toaster />
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}
