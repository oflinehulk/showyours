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
import { useCreateSquad, useMySquads } from '@/hooks/useSquads';
import { useMyProfile } from '@/hooks/useProfiles';
import { RANKS, ROLES } from '@/lib/constants';
import { ArrowLeft, Check, Shield, Loader2, AlertCircle, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CreateSquadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: existingSquads, isLoading: squadsLoading } = useMySquads();
  const { data: myProfile, isLoading: profileLoading } = useMyProfile();
  const createSquad = useCreateSquad();
  
  // Form state
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [minRank, setMinRank] = useState('');
  const [neededRoles, setNeededRoles] = useState<string[]>([]);
  const [maxMembers, setMaxMembers] = useState('10');
  
  // Contact state for squad listing
  const [whatsapp, setWhatsapp] = useState('');
  const [discord, setDiscord] = useState('');

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to create a squad');
      navigate('/auth');
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!squadsLoading && existingSquads && existingSquads.length > 0) {
      toast.info('You already have a squad. You can only create one squad.');
      navigate(`/squad/${existingSquads[0].id}`);
    }
  }, [existingSquads, squadsLoading, navigate]);

  // Check if user has a profile
  const hasProfile = !!myProfile;

  // Check if profile has WhatsApp
  const hasWhatsAppContact = (() => {
    if (!myProfile) return false;
    const contacts = typeof myProfile.contacts === 'string' 
      ? JSON.parse(myProfile.contacts) 
      : myProfile.contacts || [];
    return contacts.some((c: any) => c.type === 'whatsapp' && c.value);
  })();

  const toggleRole = (roleId: string) => {
    if (neededRoles.includes(roleId)) {
      setNeededRoles(neededRoles.filter((r) => r !== roleId));
    } else {
      setNeededRoles([...neededRoles, roleId]);
    }
  };

  const buildContacts = () => {
    const contacts: { type: string; value: string }[] = [];
    if (whatsapp.trim()) contacts.push({ type: 'whatsapp', value: whatsapp.trim() });
    if (discord.trim()) contacts.push({ type: 'discord', value: discord.trim() });
    return contacts;
  };

  const canSubmit = () => {
    return (
      hasProfile &&
      hasWhatsAppContact &&
      name.trim() &&
      description.trim() &&
      minRank &&
      neededRoles.length > 0 &&
      whatsapp.trim()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasProfile) {
      toast.error('You must create a profile first');
      return;
    }

    if (!hasWhatsAppContact) {
      toast.error('Your profile must have WhatsApp contact');
      return;
    }
    
    try {
      const result = await createSquad.mutateAsync({
        name: name.trim(),
        logo_url: logoUrl,
        description: description.trim(),
        min_rank: minRank as any,
        needed_roles: neededRoles as any,
        max_members: parseInt(maxMembers) || 10,
        contacts: buildContacts() as any,
        is_recruiting: true,
      });
      
      toast.success('Squad created!', {
        description: 'Now add members by searching for registered players.',
      });
      navigate(`/squad/${result.id}`);
    } catch (error: any) {
      toast.error('Failed to create squad', {
        description: error.message,
      });
    }
  };

  // Show loading state
  if (profileLoading || squadsLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </Layout>
    );
  }

  // Profile required - block creation
  if (!hasProfile) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Button variant="ghost" size="sm" asChild className="mb-6 btn-interactive">
            <Link to="/squads">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Squads
            </Link>
          </Button>

          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">Profile Required</h2>
            <p className="text-muted-foreground mb-6">
              You must create a profile with WhatsApp contact before creating a squad. 
              This allows tournament hosts to contact you.
            </p>
            <Button asChild className="btn-gaming">
              <Link to="/create-profile">
                <UserPlus className="w-4 h-4 mr-2" />
                Create Profile First
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Profile exists but no WhatsApp
  if (!hasWhatsAppContact) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <Button variant="ghost" size="sm" asChild className="mb-6 btn-interactive">
            <Link to="/squads">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Squads
            </Link>
          </Button>

          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">WhatsApp Required</h2>
            <p className="text-muted-foreground mb-6">
              As a squad leader, you must have WhatsApp contact in your profile 
              so tournament hosts can reach you.
            </p>
            <Button asChild className="btn-gaming">
              <Link to="/create-profile">
                Update Profile
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild className="mb-6 btn-interactive">
          <Link to="/squads">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Squads
          </Link>
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center glow-secondary">
              <Shield className="w-6 h-6 text-secondary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Squad</h1>
              <p className="text-muted-foreground">Build your team for tournaments</p>
            </div>
          </div>
        </div>

        {/* Info Notice */}
        <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20 mb-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-secondary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-secondary">How it works</p>
              <ul className="text-muted-foreground mt-1 space-y-1">
                <li>• You can only create one squad</li>
                <li>• Add players by searching for registered users (IGN or MLBB ID)</li>
                <li>• You'll be the Leader - you can promote Co-Leaders</li>
                <li>• Minimum 5 members required to register for tournaments</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
          {/* Squad Logo */}
          <div className="flex flex-col items-center gap-4">
            <Label>Squad Logo (Optional)</Label>
            <ImageUpload
              bucket="squad-logos"
              currentUrl={logoUrl}
              onUpload={setLogoUrl}
              onRemove={() => setLogoUrl(null)}
              shape="square"
              size="lg"
            />
          </div>

          {/* Basic Info */}
          <div>
            <Label htmlFor="name">Squad Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your squad name"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell players about your squad, practice schedule, goals..."
              className="mt-1.5 min-h-[120px]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minRank">Minimum Rank Required *</Label>
              <Select value={minRank} onValueChange={setMinRank}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select minimum rank" />
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
              <Label htmlFor="maxMembers">Maximum Members</Label>
              <Select value={maxMembers} onValueChange={setMaxMembers}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Max size?" />
                </SelectTrigger>
                <SelectContent>
                  {[5, 6, 7, 8, 9, 10].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} members
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Needed Roles */}
          <div>
            <Label className="mb-3 block">Positions Looking For *</Label>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 active:scale-95',
                    neededRoles.includes(role.id)
                      ? 'bg-primary/10 border-primary text-primary'
                      : 'bg-muted border-transparent text-muted-foreground hover:text-foreground'
                  )}
                >
                  {role.icon}
                  <span>{role.name}</span>
                  {neededRoles.includes(role.id) && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info for listing */}
          <div className="space-y-4">
            <Label className="mb-3 block">Squad Contact Info</Label>
            <p className="text-sm text-muted-foreground">
              This will be shown on your squad listing for players to contact you.
            </p>

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
                Discord Server <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="discord"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="e.g., discord.gg/invite"
                className="mt-1.5"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-border">
            <Button
              type="submit"
              className="w-full btn-gaming"
              disabled={!canSubmit() || createSquad.isPending}
            >
              {createSquad.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Create Squad
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-3">
              After creating, you'll add members by searching for registered players
            </p>
          </div>
        </form>
      </div>
    </Layout>
  );
}
