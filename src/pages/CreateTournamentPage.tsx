import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { TiptapEditor } from '@/components/TiptapEditor';
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
import { ArrowLeft, Trophy, Calendar, Users, Wallet, Loader2, AlertCircle, Swords, Globe, MessageCircle, Ticket, IndianRupee, Plus, Trash2, Medal } from 'lucide-react';
import { toast } from 'sonner';
import type { PrizeTier } from '@/lib/tournament-types';

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

  // New structured fields
  const [prizePool, setPrizePool] = useState('');
  const [teamSize, setTeamSize] = useState('5v5');
  const [entryFee, setEntryFee] = useState('');
  const [region, setRegion] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [prizeTiers, setPrizeTiers] = useState<PrizeTier[]>([
    { place: 1, label: '1st Place', prize: '', distributed: false },
    { place: 2, label: '2nd Place', prize: '', distributed: false },
  ]);

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
        format: null,
        prize_wallet: prizeWallet.trim() || null,
        banner_url: bannerUrl,
        prize_pool: prizePool.trim() || null,
        team_size: teamSize || null,
        entry_fee: entryFee.trim() || null,
        region: region || null,
        contact_info: contactInfo.trim() || null,
        prize_tiers: prizeTiers.some(t => t.prize.trim()) ? prizeTiers.filter(t => t.prize.trim()) : null,
        is_multi_stage: false,
      });

      toast.success('Tournament created!', {
        description: 'Squads can now register for your tournament.',
      });
      navigate(`/tournament/${tournament.id}`);
    } catch (error: unknown) {
      toast.error('Failed to create tournament', {
        description: error instanceof Error ? error.message : 'Unknown error',
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
                <li>• Squads register with 5 main players + up to 5 substitutes (10 max)</li>
                <li>• After registration closes, you select the format and generate brackets</li>
                <li>• Match format: Bo1 for early rounds, Bo3 for semis, Bo5 for finals</li>
              </ul>
            </div>
          </div>
        </GlowCard>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Info */}
          <GlowCard>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-gradient-to-b from-[#FF4500] to-[#FF4500]/30 rounded-full" />
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#FF4500]">Basic Info</h2>
              </div>

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

              {/* Tournament Name */}
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

              {/* Description */}
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
            </div>
          </GlowCard>

          {/* Section 2: Tournament Details */}
          <GlowCard>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-gradient-to-b from-[#FF4500] to-[#FF4500]/30 rounded-full" />
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#FF4500]">Tournament Details</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Prize Pool */}
                <div>
                  <Label htmlFor="prizePool" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                    <IndianRupee className="w-4 h-4 inline mr-1" />
                    Prize Pool
                  </Label>
                  <Input
                    id="prizePool"
                    value={prizePool}
                    onChange={(e) => setPrizePool(e.target.value)}
                    placeholder="e.g. ₹5,000 or 100 USDT"
                    className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                  />
                </div>

                {/* Team Size */}
                <div>
                  <Label htmlFor="teamSize" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                    <Users className="w-4 h-4 inline mr-1" />
                    Team Size
                  </Label>
                  <Select value={teamSize} onValueChange={setTeamSize}>
                    <SelectTrigger className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20">
                      <SelectValue placeholder="Select team size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5v5">5v5</SelectItem>
                      <SelectItem value="3v3">3v3</SelectItem>
                      <SelectItem value="1v1">1v1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Entry Fee */}
                <div>
                  <Label htmlFor="entryFee" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                    <Ticket className="w-4 h-4 inline mr-1" />
                    Entry Fee
                  </Label>
                  <Input
                    id="entryFee"
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    placeholder="e.g. Free, ₹100 per team"
                    className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                  />
                </div>

                {/* Max Squads */}
                <div>
                  <Label htmlFor="maxSquads" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                    <Swords className="w-4 h-4 inline mr-1" />
                    Max Squads *
                  </Label>
                  <Input
                    id="maxSquads"
                    type="number"
                    min={2}
                    value={maxSquads}
                    onChange={(e) => setMaxSquads(e.target.value)}
                    placeholder="e.g. 16"
                    className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground/60 italic">
                Tournament format (Single Elimination, Double Elimination, Round Robin, or Multi-Stage) is chosen after registration closes.
              </p>
            </div>
          </GlowCard>

          {/* Section 3: Schedule */}
          <GlowCard>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-gradient-to-b from-[#FF4500] to-[#FF4500]/30 rounded-full" />
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#FF4500]">Schedule</h2>
              </div>

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
            </div>
          </GlowCard>

          {/* Section 4: Contact & Region */}
          <GlowCard>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-gradient-to-b from-[#FF4500] to-[#FF4500]/30 rounded-full" />
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#FF4500]">Contact & Region</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Region */}
                <div>
                  <Label htmlFor="region" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                    <Globe className="w-4 h-4 inline mr-1" />
                    Region / Server
                  </Label>
                  <Select value={region} onValueChange={setRegion}>
                    <SelectTrigger className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20">
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="India">India</SelectItem>
                      <SelectItem value="SEA">SEA</SelectItem>
                      <SelectItem value="Global">Global</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Contact Info */}
                <div>
                  <Label htmlFor="contactInfo" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                    <MessageCircle className="w-4 h-4 inline mr-1" />
                    Contact Info
                  </Label>
                  <Input
                    id="contactInfo"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                    placeholder="Discord ID or WhatsApp number"
                    className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                  />
                </div>
              </div>
            </div>
          </GlowCard>

          {/* Section 5: Rules */}
          <GlowCard>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-gradient-to-b from-[#FF4500] to-[#FF4500]/30 rounded-full" />
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-[#FF4500]">Rules</h2>
              </div>

              <div>
                <Label className="text-xs font-display uppercase tracking-wider text-muted-foreground mb-2 block">Tournament Rules</Label>
                <TiptapEditor
                  content={rules}
                  onChange={setRules}
                  placeholder="Game mode: Draft Pick 5v5, Ban 5. Room type: Tournament (LIVE)..."
                />
              </div>
            </div>
          </GlowCard>

          {/* Section 6: Prize Wallet */}
          <GlowCard>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-gradient-to-b from-yellow-500 to-yellow-500/30 rounded-full" />
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-yellow-500">Prize Wallet</h2>
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
            </div>
          </GlowCard>

          {/* Section 7: Prize Tiers */}
          <GlowCard>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-6 w-1 bg-gradient-to-b from-yellow-500 to-yellow-500/30 rounded-full" />
                <h2 className="text-sm font-display font-bold uppercase tracking-wider text-yellow-500">Prize Breakdown</h2>
              </div>

              <p className="text-xs text-muted-foreground">
                Define how the prize pool is distributed. Leave prize amounts empty to skip.
              </p>

              <div className="space-y-3">
                {prizeTiers.map((tier, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border/50">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center shrink-0">
                      <Medal className="w-4 h-4 text-yellow-500" />
                    </div>
                    <Input
                      value={tier.label}
                      onChange={(e) => {
                        const updated = [...prizeTiers];
                        updated[index] = { ...tier, label: e.target.value };
                        setPrizeTiers(updated);
                      }}
                      placeholder="e.g. 1st Place"
                      className="flex-1 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                    />
                    <Input
                      value={tier.prize}
                      onChange={(e) => {
                        const updated = [...prizeTiers];
                        updated[index] = { ...tier, prize: e.target.value };
                        setPrizeTiers(updated);
                      }}
                      placeholder="e.g. ₹3,000"
                      className="flex-1 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
                    />
                    {prizeTiers.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => setPrizeTiers(prizeTiers.filter((_, i) => i !== index))}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPrizeTiers([
                  ...prizeTiers,
                  { place: prizeTiers.length + 1, label: '', prize: '', distributed: false },
                ])}
                className="border-yellow-500/20 text-yellow-500 hover:bg-yellow-500/10"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Prize Tier
              </Button>
            </div>
          </GlowCard>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              className="w-full btn-gaming py-6 text-base"
              disabled={!canSubmit() || createTournament.isPending}
            >
              {createTournament.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trophy className="w-5 h-5 mr-2" />
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
