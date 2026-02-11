import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload, MultiImageUpload } from '@/components/ImageUpload';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateProfile, useMyProfile, useUpdateProfile } from '@/hooks/useProfiles';
import { RANKS, INDIAN_STATES, ALL_HEROES } from '@/lib/constants';
import { ArrowLeft, ArrowRight, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { MultiRoleSelect } from '@/components/MultiRoleSelect';
import { useHeroes } from '@/hooks/useHeroes';
import { parseContacts } from '@/lib/contacts';

type Step = 1 | 2 | 3 | 4;

export default function CreateProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existingProfile, isLoading: profileLoading } = useMyProfile();
  const createProfile = useCreateProfile();
  const updateProfile = useUpdateProfile();
  const { data: dbHeroes } = useHeroes();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form state
  const [ign, setIgn] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [state, setState] = useState('');
  const [rank, setRank] = useState('');
  const [winRate, setWinRate] = useState('');
  const [mainRoles, setMainRoles] = useState<string[]>([]);
  const [favoriteHeroes, setFavoriteHeroes] = useState<string[]>([]);
  const [heroInput, setHeroInput] = useState('');
  const [bio, setBio] = useState('');
  const [lookingForSquad, setLookingForSquad] = useState(true);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [gameId, setGameId] = useState('');
  
  // Contact state
  const [whatsapp, setWhatsapp] = useState('');
  const [discord, setDiscord] = useState('');
  const [instagram, setInstagram] = useState('');

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to create a profile');
      navigate('/auth');
    }
  }, [user, navigate]);

  // Populate form with existing profile data for editing
  useEffect(() => {
    if (existingProfile) {
      setIsEditMode(true);
      setIgn(existingProfile.ign || '');
      setAvatarUrl(existingProfile.avatar_url || null);
      setState(existingProfile.state || '');
      setRank(existingProfile.rank || '');
      setWinRate(existingProfile.win_rate?.toString() || '');
      const roles = (existingProfile as any).main_roles;
      if (roles && roles.length > 0) {
        setMainRoles(roles);
      } else if (existingProfile.main_role) {
        setMainRoles([existingProfile.main_role]);
      }
      setFavoriteHeroes(existingProfile.favorite_heroes || []);
      setBio(existingProfile.bio || '');
      setLookingForSquad(existingProfile.looking_for_squad ?? true);
      setScreenshots(existingProfile.screenshots || []);
      
      // Parse contacts - use game-id as the single Game ID field
      const contacts = parseContacts(existingProfile.contacts);
      const gameIdContact = contacts.find((c: { type: string }) => c.type === 'game-id');
      setGameId(gameIdContact?.value || (existingProfile as any).mlbb_id || '');
      
      contacts.forEach((contact: { type: string; value: string }) => {
        switch (contact.type) {
          case 'whatsapp':
            setWhatsapp(contact.value);
            break;
          case 'discord':
            setDiscord(contact.value);
            break;
          case 'instagram':
            setInstagram(contact.value);
            break;
        }
      });
    }
  }, [existingProfile]);

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Game Stats' },
    { number: 3, title: 'Contact' },
    { number: 4, title: 'Extras' },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return ign.trim() && gameId.trim() && state;
      case 2:
        return rank && mainRoles.length > 0;
      case 3:
        return whatsapp.trim();
      case 4:
        return true;
      default:
        return false;
    }
  };

  const addHero = (hero: string) => {
    if (hero && !favoriteHeroes.includes(hero) && favoriteHeroes.length < 5) {
      setFavoriteHeroes([...favoriteHeroes, hero]);
      setHeroInput('');
    }
  };

  const removeHero = (hero: string) => {
    setFavoriteHeroes(favoriteHeroes.filter((h) => h !== hero));
  };

  const suggestedHeroes = ALL_HEROES.filter(
    (h) => 
      h.toLowerCase().includes(heroInput.toLowerCase()) && 
      !favoriteHeroes.includes(h)
  ).slice(0, 8);

  const buildContacts = () => {
    const contacts: { type: string; value: string }[] = [];
    if (gameId.trim()) contacts.push({ type: 'game-id', value: gameId.trim() });
    if (whatsapp.trim()) contacts.push({ type: 'whatsapp', value: whatsapp.trim() });
    if (discord.trim()) contacts.push({ type: 'discord', value: discord.trim() });
    if (instagram.trim()) contacts.push({ type: 'instagram', value: instagram.trim() });
    return contacts;
  };

  const handleSubmit = async () => {
    // Simple inline validation
    if (!ign.trim()) {
      toast.error('Please enter your In-Game Name');
      setCurrentStep(1);
      return;
    }
    if (!gameId.trim()) {
      toast.error('Please enter your Game ID');
      setCurrentStep(1);
      return;
    }
    if (!rank) {
      toast.error('Please select your rank');
      setCurrentStep(2);
      return;
    }
    if (mainRoles.length === 0) {
      toast.error('Please select at least one role');
      setCurrentStep(2);
      return;
    }
    if (!whatsapp.trim()) {
      toast.error('Please enter your WhatsApp number');
      setCurrentStep(3);
      return;
    }

    const profileData = {
      ign: ign.trim(),
      avatar_url: avatarUrl,
      rank: rank as any,
      state: state as any,
      win_rate: winRate ? parseFloat(winRate) : null,
      main_role: mainRoles[0] || 'gold' as any,
      main_roles: mainRoles,
      hero_class: 'fighter' as any, // default, not user-facing
      favorite_heroes: favoriteHeroes,
      bio: bio.trim() || null,
      looking_for_squad: lookingForSquad,
      contacts: buildContacts() as any,
      screenshots,
      mlbb_id: gameId.trim() || null, // use same Game ID for mlbb_id
    };

    try {
      if (isEditMode && existingProfile) {
        await updateProfile.mutateAsync({
          id: existingProfile.id,
          ...profileData,
        });
        toast.success('Profile updated successfully!');
        navigate(`/player/${existingProfile.id}`);
      } else {
        await createProfile.mutateAsync(profileData);
        toast.success('Profile created successfully!');
        navigate('/players');
      }
    } catch (error: any) {
      toast.error(isEditMode ? 'Failed to update profile' : 'Failed to create profile', {
        description: error.message,
      });
    }
  };

  const isPending = createProfile.isPending || updateProfile.isPending;

  if (profileLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {isEditMode ? 'Edit Your Profile' : 'Create Your Profile'}
          </h1>
          <p className="text-muted-foreground">
            {isEditMode 
              ? 'Update your details and showcase your latest achievements'
              : 'Showcase your skills and get discovered by squads'
            }
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 overflow-x-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200 flex-shrink-0',
                  currentStep >= step.number
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {currentStep > step.number ? (
                  <Check className="w-5 h-5" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={cn(
                  'ml-2 text-sm hidden sm:block whitespace-nowrap',
                  currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 sm:w-16 h-0.5 mx-2 transition-colors flex-shrink-0',
                    currentStep > step.number ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="glass-card p-6">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex flex-col items-center gap-4">
                <Label>Profile Photo</Label>
                <ImageUpload
                  bucket="avatars"
                  currentUrl={avatarUrl}
                  onUpload={setAvatarUrl}
                  onRemove={() => setAvatarUrl(null)}
                  size="lg"
                />
              </div>

              <div>
                <Label htmlFor="ign">In-Game Name (IGN) *</Label>
                <Input
                  id="ign"
                  value={ign}
                  onChange={(e) => setIgn(e.target.value)}
                  placeholder="Your MLBB username"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="gameId">Game ID *</Label>
                <Input
                  id="gameId"
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                  placeholder="e.g., 123456789 (1234)"
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Your MLBB numeric ID with server number in brackets
                </p>
              </div>

              <div>
                <Label htmlFor="state">Your State *</Label>
                <Select value={state} onValueChange={setState}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your state" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDIAN_STATES.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 2: Game Stats */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <Label htmlFor="rank">Current Rank *</Label>
                <Select value={rank} onValueChange={setRank}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your rank" />
                  </SelectTrigger>
                  <SelectContent>
                    {RANKS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="winRate">Win Rate % (Optional)</Label>
                <Input
                  id="winRate"
                  type="number"
                  min="0"
                  max="100"
                  value={winRate}
                  onChange={(e) => setWinRate(e.target.value)}
                  placeholder="e.g., 55.5"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Main Roles * (Select all that apply)</Label>
                <div className="mt-2">
                  <MultiRoleSelect 
                    selectedRoles={mainRoles}
                    onRolesChange={setMainRoles}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <Label htmlFor="whatsapp">
                  WhatsApp Number * <span className="text-xs text-muted-foreground">(Required)</span>
                </Label>
                <Input
                  id="whatsapp"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="e.g., +91 98765 43210"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="discord">
                  Discord <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="discord"
                  value={discord}
                  onChange={(e) => setDiscord(e.target.value)}
                  placeholder="e.g., username#1234"
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label htmlFor="instagram">
                  Instagram <span className="text-xs text-muted-foreground">(Optional)</span>
                </Label>
                <Input
                  id="instagram"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="e.g., @username"
                  className="mt-1.5"
                />
              </div>
            </div>
          )}

          {/* Step 4: Extras */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell squads about yourself..."
                  className="mt-1.5 min-h-[80px]"
                />
              </div>

              <div>
                <Label htmlFor="heroes">Favorite Heroes (up to 5, optional)</Label>
                <div className="relative mt-1.5">
                  <Input
                    id="heroes"
                    value={heroInput}
                    onChange={(e) => setHeroInput(e.target.value)}
                    placeholder="Type a hero name..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && heroInput) {
                        e.preventDefault();
                        addHero(heroInput);
                      }
                    }}
                  />
                  {heroInput && suggestedHeroes.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden max-h-48 overflow-y-auto">
                      {suggestedHeroes.map((hero) => (
                        <button
                          key={hero}
                          type="button"
                          onClick={() => addHero(hero)}
                          className="w-full px-4 py-2 text-left hover:bg-muted transition-colors text-foreground"
                        >
                          {hero}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {favoriteHeroes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {favoriteHeroes.map((hero) => (
                    <span
                      key={hero}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-lg"
                    >
                      {hero}
                      <button
                        type="button"
                        onClick={() => removeHero(hero)}
                        className="hover:text-destructive transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <Label className="mb-3 block">Screenshots (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Add screenshots of your stats, rank, or gameplay
                </p>
                <MultiImageUpload
                  bucket="screenshots"
                  images={screenshots}
                  maxImages={5}
                  onUpload={(url) => setScreenshots([...screenshots, url])}
                  onRemove={(url) => setScreenshots(screenshots.filter(s => s !== url))}
                />
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-border">
                <Checkbox
                  id="lookingForSquad"
                  checked={lookingForSquad}
                  onCheckedChange={(checked) => setLookingForSquad(!!checked)}
                />
                <Label htmlFor="lookingForSquad" className="cursor-pointer">
                  I'm actively looking for a squad
                </Label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setCurrentStep((currentStep - 1) as Step)}
              disabled={currentStep === 1}
              className="btn-interactive"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep < 4 ? (
              <Button
                onClick={() => setCurrentStep((currentStep + 1) as Step)}
                disabled={!canProceed()}
                className="btn-interactive"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                className="btn-gaming"
                onClick={handleSubmit}
                disabled={!canProceed() || isPending}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {isEditMode ? 'Save Changes' : 'Create Profile'}
                    <Check className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
