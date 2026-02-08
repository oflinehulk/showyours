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
        <Button variant="ghost" size="sm" asChild className="mb-6 btn-interactive">
          <Link to="/tournaments">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center glow-primary">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Host Tournament</h1>
              <p className="text-muted-foreground">Create a new MLBB tournament</p>
            </div>
          </div>
        </div>

        {/* Info Notice */}
        <div className="p-4 bg-primary/10 rounded-lg border border-primary/20 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">Tournament Rules</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• Squads register with 5 main players + up to 2 substitutes</li>
                <li>• After registration closes, you select the format and generate brackets</li>
                <li>• Match format: Bo1 for early rounds, Bo3 for semis, Bo5 for finals</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
          {/* Banner Upload */}
          <div>
            <Label className="mb-3 block">Tournament Banner (Optional)</Label>
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
            <Label htmlFor="name">Tournament Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., MLBB India Championship 2026"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell participants about your tournament..."
              className="mt-1.5 min-h-[100px]"
            />
          </div>

          <div>
            <Label htmlFor="rules">Rules</Label>
            <Textarea
              id="rules"
              value={rules}
              onChange={(e) => setRules(e.target.value)}
              placeholder="Game mode: Draft Pick 5v5, Ban 5. Room type: Tournament (LIVE)..."
              className="mt-1.5 min-h-[100px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateTime">
                <Calendar className="w-4 h-4 inline mr-2" />
                Date & Time *
              </Label>
              <Input
                id="dateTime"
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="mt-1.5"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div>
              <Label htmlFor="maxSquads">
                <Users className="w-4 h-4 inline mr-2" />
                Max Squads *
              </Label>
              <Select value={maxSquads} onValueChange={setMaxSquads}>
                <SelectTrigger className="mt-1.5">
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
            <Label htmlFor="prizeWallet">
              <Wallet className="w-4 h-4 inline mr-2" />
              USDT Prize Wallet (Optional)
            </Label>
            <Input
              id="prizeWallet"
              value={prizeWallet}
              onChange={(e) => setPrizeWallet(e.target.value)}
              placeholder="Crypto wallet address for prize distribution"
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If you're offering a prize pool, enter the wallet address where winners will receive USDT.
            </p>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-border">
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
      </div>
    </Layout>
  );
}
