import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '@/components/ImageUpload';
import { GlowCard } from '@/components/tron/GlowCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateTournament } from '@/hooks/useTournaments';
import { ArrowLeft, Trophy, Calendar, Users, Wallet, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { MAX_SQUAD_SIZES } from '@/lib/tournament-types';

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createTournament = useCreateTournament();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [maxSquads, setMaxSquads] = useState('16');
  const [prizeWallet, setPrizeWallet] = useState('');
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to host a tournament');
      navigate('/auth');
    }
  }, [user, navigate]);

  const canSubmit = () => {
    return name.trim() && dateTime && maxSquads;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedDate = new Date(dateTime);
    if (selectedDate <= new Date()) {
      toast.error('Tournament date must be in the future');
      return;
    }

    try {
      const tournament = await createTournament.mutateAsync({
        name: name.trim(),
        description: description.trim() || null,
        rules: rules.trim() || null,
        date_time: selectedDate.toISOString(),
        max_squads: parseInt(maxSquads),
        status: 'registration_open',
        format: null, // Set when bracket is generated
        prize_wallet: prizeWallet.trim() || null,
        banner_url: bannerUrl,
      });

      toast.success('Tournament created!', {
        description: 'Squads can now register for your tournament.',
      });
      navigate(`/tournament/${tournament.id}`);
    } catch (error: any) {
      toast.error('Failed to create tournament', {
        description: error.message,
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild className="mb-6 text-muted-foreground hover:text-foreground">
          <Link to="/tournaments">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#FF4500]/10 border border-[#FF4500]/20 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-[#FF4500]" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-wide">Host Tournament</h1>
            <p className="text-muted-foreground text-sm">Create a new MLBB tournament</p>
          </div>
        </div>

        {/* Info Notice */}
        <GlowCard className="p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#FF4500] mt-0.5" />
            <div className="text-sm">
              <p className="font-display font-medium text-[#FF4500] uppercase tracking-wider text-xs">Tournament Rules</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• Squads register with 5 main players + up to 2 substitutes</li>
                <li>• After registration closes, you select the format and generate brackets</li>
                <li>• Match format: Bo1 for early rounds, Bo3 for semis, Bo5 for finals</li>
              </ul>
            </div>
          </div>
        </GlowCard>

        {/* Form */}
        <GlowCard>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Banner Upload */}
            <div>
              <Label className="mb-3 block text-xs font-display uppercase tracking-wider text-muted-foreground">Tournament Banner (Optional)</Label>
              <ImageUpload
                bucket="tournament-assets"
                currentUrl={bannerUrl}
                onUpload={setBannerUrl}
                onRemove={() => setBannerUrl(null)}
                shape="wide"
                size="lg"
              />
            </div>

            {/* Basic Info */}
            <div>
              <Label htmlFor="name" className="text-xs font-display uppercase tracking-wider text-muted-foreground">Tournament Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., MLBB India Championship 2026"
                className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
              />
            </div>

            <div>
              <Label htmlFor="description" className="text-xs font-display uppercase tracking-wider text-muted-foreground">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell participants about your tournament..."
                className="mt-1.5 min-h-[100px] bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
              />
            </div>

            <div>
              <Label htmlFor="rules" className="text-xs font-display uppercase tracking-wider text-muted-foreground">Rules</Label>
              <Textarea
                id="rules"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
                placeholder="Game mode: Draft Pick 5v5, Ban 5. Room type: Tournament (LIVE)..."
                className="mt-1.5 min-h-[100px] bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dateTime" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date & Time *
                </Label>
                <Input
                  id="dateTime"
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>

              <div>
                <Label htmlFor="maxSquads" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                  <Users className="w-4 h-4 inline mr-2" />
                  Max Squads *
                </Label>
                <Select value={maxSquads} onValueChange={setMaxSquads}>
                  <SelectTrigger className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20">
                    <SelectValue placeholder="Select max squads" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAX_SQUAD_SIZES.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} squads
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="prizeWallet" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                <Wallet className="w-4 h-4 inline mr-2" />
                USDT Prize Wallet (Optional)
              </Label>
              <Input
                id="prizeWallet"
                value={prizeWallet}
                onChange={(e) => setPrizeWallet(e.target.value)}
                placeholder="Crypto wallet address for prize distribution"
                className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                If you're offering a prize pool, enter the wallet address where winners will receive USDT.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-[#FF4500]/10">
              <Button
                type="submit"
                className="w-full btn-gaming"
                disabled={!canSubmit() || createTournament.isPending}
              >
                {createTournament.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Create Tournament
                  </>
                )}
              </Button>
            </div>
          </form>
        </GlowCard>
      </div>
    </Layout>
  );
}
