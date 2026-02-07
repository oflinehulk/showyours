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
import { useAuth } from '@/contexts/AuthContext';
import { useCreateProfile, useMyProfile } from '@/hooks/useProfiles';
import { RANKS, ROLES, HERO_CLASSES, SERVERS, CONTACT_TYPES, POPULAR_HEROES } from '@/lib/constants';
import { ArrowLeft, ArrowRight, Check, Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Step = 1 | 2 | 3 | 4;

export default function CreateProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existingProfile } = useMyProfile();
  const createProfile = useCreateProfile();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  
  // Form state
  const [ign, setIgn] = useState('');
  const [rank, setRank] = useState('');
  const [server, setServer] = useState('');
  const [winRate, setWinRate] = useState('');
  const [mainRole, setMainRole] = useState('');
  const [heroClass, setHeroClass] = useState('');
  const [favoriteHeroes, setFavoriteHeroes] = useState<string[]>([]);
  const [heroInput, setHeroInput] = useState('');
  const [bio, setBio] = useState('');
  const [lookingForSquad, setLookingForSquad] = useState(true);
  const [contacts, setContacts] = useState<{ type: string; value: string }[]>([]);
  const [newContactType, setNewContactType] = useState('discord');
  const [newContactValue, setNewContactValue] = useState('');

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to create a profile');
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (existingProfile) {
      toast.info('You already have a profile');
      navigate(`/player/${existingProfile.id}`);
    }
  }, [existingProfile, navigate]);

  const steps = [
    { number: 1, title: 'Basic Info' },
    { number: 2, title: 'Stats' },
    { number: 3, title: 'Heroes' },
    { number: 4, title: 'Contact' },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return ign.trim() && server;
      case 2:
        return rank && mainRole && heroClass;
      case 3:
        return true;
      case 4:
        return contacts.length > 0;
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

  const addContact = () => {
    if (newContactValue.trim()) {
      setContacts([...contacts, { type: newContactType, value: newContactValue.trim() }]);
      setNewContactValue('');
    }
  };

  const removeContact = (index: number) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    try {
      await createProfile.mutateAsync({
        ign: ign.trim(),
        rank: rank as any,
        server: server as any,
        win_rate: winRate ? parseFloat(winRate) : null,
        main_role: mainRole as any,
        hero_class: heroClass as any,
        favorite_heroes: favoriteHeroes,
        bio: bio.trim() || null,
        looking_for_squad: lookingForSquad,
        contacts: contacts as any,
      });
      
      toast.success('Profile created successfully!', {
        description: 'Your profile is now visible to squads.',
      });
      navigate('/players');
    } catch (error: any) {
      toast.error('Failed to create profile', {
        description: error.message,
      });
    }
  };

  const suggestedHeroes = POPULAR_HEROES.filter(
    (h) => 
      h.toLowerCase().includes(heroInput.toLowerCase()) && 
      !favoriteHeroes.includes(h)
  ).slice(0, 5);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Profile</h1>
          <p className="text-muted-foreground">
            Showcase your skills and get discovered by squads
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-200',
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
                  'ml-2 text-sm hidden sm:block',
                  currentStep >= step.number ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'w-8 sm:w-16 h-0.5 mx-2 sm:mx-4 transition-colors',
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
                <Label htmlFor="server">Server *</Label>
                <Select value={server} onValueChange={setServer}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your server" />
                  </SelectTrigger>
                  <SelectContent>
                    {SERVERS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="bio">Bio (Optional)</Label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell squads about yourself..."
                  className="mt-1.5 min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Step 2: Stats */}
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
                <Label htmlFor="mainRole">Main Role *</Label>
                <Select value={mainRole} onValueChange={setMainRole}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your main role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.icon} {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="heroClass">Hero Class *</Label>
                <Select value={heroClass} onValueChange={setHeroClass}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select your hero class" />
                  </SelectTrigger>
                  <SelectContent>
                    {HERO_CLASSES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 3: Heroes */}
          {currentStep === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <Label htmlFor="heroes">Favorite Heroes (up to 5)</Label>
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
                    <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-10 overflow-hidden">
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

          {/* Step 4: Contact */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-fade-in">
              <p className="text-sm text-muted-foreground">
                Add at least one way for squads to contact you
              </p>

              <div className="flex gap-2">
                <Select value={newContactType} onValueChange={setNewContactType}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPES.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={newContactValue}
                  onChange={(e) => setNewContactValue(e.target.value)}
                  placeholder="Enter your ID or username"
                  className="flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addContact();
                    }
                  }}
                />
                <Button type="button" onClick={addContact} size="icon" className="btn-interactive">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {contacts.length > 0 && (
                <div className="space-y-2">
                  {contacts.map((contact, index) => {
                    const contactType = CONTACT_TYPES.find((c) => c.id === contact.type);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <p className="text-xs text-muted-foreground">{contactType?.name}</p>
                          <p className="text-foreground font-medium">{contact.value}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeContact(index)}
                          className="btn-interactive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
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
                disabled={!canProceed() || createProfile.isPending}
              >
                {createProfile.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Create Profile
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
