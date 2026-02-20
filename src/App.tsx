import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { OnboardingProvider } from "@/contexts/OnboardingContext";
import HomePage from "./pages/HomePage";
import PlayersPage from "./pages/PlayersPage";
import SquadsPage from "./pages/SquadsPage";
import PlayerProfilePage from "./pages/PlayerProfilePage";
import SquadDetailPage from "./pages/SquadDetailPage";
import CreateProfilePage from "./pages/CreateProfilePage";
import CreateSquadPage from "./pages/CreateSquadPage";
import EditSquadPage from "./pages/EditSquadPage";
import TournamentsPage from "./pages/TournamentsPage";
import CreateTournamentPage from "./pages/CreateTournamentPage";
import TournamentDetailPage from "./pages/TournamentDetailPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <OnboardingProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/players" element={<PlayersPage />} />
                <Route path="/squads" element={<SquadsPage />} />
                <Route path="/player/:id" element={<PlayerProfilePage />} />
                <Route path="/squad/:id" element={<SquadDetailPage />} />
                <Route path="/squad/:id/edit" element={<EditSquadPage />} />
                <Route path="/create-profile" element={<CreateProfilePage />} />
                <Route path="/create-squad" element={<CreateSquadPage />} />
                <Route path="/tournaments" element={<TournamentsPage />} />
                <Route path="/create-tournament" element={<CreateTournamentPage />} />
                <Route path="/tournament/:id" element={<TournamentDetailPage />} />
                <Route path="/admin" element={<AdminPage />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </OnboardingProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
