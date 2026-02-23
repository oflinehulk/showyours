import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Loader2 } from "lucide-react";

// Lazy-loaded pages for code splitting
const HomePage = lazy(() => import("./pages/HomePage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const PlayersPage = lazy(() => import("./pages/PlayersPage"));
const SquadsPage = lazy(() => import("./pages/SquadsPage"));
const PlayerProfilePage = lazy(() => import("./pages/PlayerProfilePage"));
const SquadDetailPage = lazy(() => import("./pages/SquadDetailPage"));
const EditSquadPage = lazy(() => import("./pages/EditSquadPage"));
const CreateProfilePage = lazy(() => import("./pages/CreateProfilePage"));
const CreateSquadPage = lazy(() => import("./pages/CreateSquadPage"));
const TournamentsPage = lazy(() => import("./pages/TournamentsPage"));
const CreateTournamentPage = lazy(() => import("./pages/CreateTournamentPage"));
const TournamentDetailPage = lazy(() => import("./pages/TournamentDetailPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const DocsPage = lazy(() => import("./pages/DocsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/players" element={<PlayersPage />} />
                  <Route path="/squads" element={<SquadsPage />} />
                  <Route path="/player/:id" element={<PlayerProfilePage />} />
                  <Route path="/squad/:id" element={<SquadDetailPage />} />
                  <Route path="/tournaments" element={<TournamentsPage />} />
                  <Route path="/tournament/:id" element={<TournamentDetailPage />} />
                  <Route path="/docs" element={<DocsPage />} />

                  {/* Protected routes — require authentication */}
                  <Route path="/create-profile" element={<ProtectedRoute><CreateProfilePage /></ProtectedRoute>} />
                  <Route path="/create-squad" element={<ProtectedRoute><CreateSquadPage /></ProtectedRoute>} />
                  <Route path="/squad/:id/edit" element={<ProtectedRoute><EditSquadPage /></ProtectedRoute>} />
                  <Route path="/create-tournament" element={<ProtectedRoute><CreateTournamentPage /></ProtectedRoute>} />
                  <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />

                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
