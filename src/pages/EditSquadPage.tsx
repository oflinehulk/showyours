import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
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
import { useSquad, useUpdateSquad } from '@/hooks/useSquads';
import { RANKS, ROLES } from '@/lib/constants';
import { parseContacts } from '@/lib/contacts';
import { GlowCard } from '@/components/tron/GlowCard';
import { CircuitLoader } from '@/components/tron/CircuitLoader';
import { ArrowLeft, Check, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function EditSquadPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: squad, isLoading: squadLoading } = useSquad(id || '');
  const updateSquad = useUpdateSquad();
  
  // Form state
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [minRank, setMinRank] = useState('');
  const [neededRoles, setNeededRoles] = useState<string[]>([]);
  const [maxMembers, setMaxMembers] = useState('10');
  
  // Contact state
  const [whatsapp, setWhatsapp] = useState('');
  const [discord, setDiscord] = useState('');

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in');
      navigate('/auth');
    }
  }, [user, navigate]);

  // Check ownership
  useEffect(() => {
    if (squad && user && squad.owner_id !== user.id) {
      toast.error('You can only edit your own squad');
      navigate('/squads');
    }
  }, [squad, user, navigate]);

  // Populate form with existing data
  useEffect(() => {
    if (squad) {
      setName(squad.name || '');
      setLogoUrl(squad.logo_url || null);
      setDescription(squad.description || '');
      setMinRank(squad.min_rank || '');
      setNeededRoles(squad.needed_roles || []);
      setMaxMembers((squad.max_members || 10).toString());
      
      // Parse contacts
      const contacts = parseContacts(squad.contacts);
      
      contacts.forEach((contact: { type: string; value: string }) => {
        if (contact.type === 'whatsapp') setWhatsapp(contact.value);
        if (contact.type === 'discord') setDiscord(contact.value);
      });
    }
  }, [squad]);

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
      name.trim() &&
      description.trim() &&
      whatsapp.trim()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    
    try {
      await updateSquad.mutateAsync({
        id,
        name: name.trim(),
        logo_url: logoUrl,
        description: description.trim(),
        min_rank: minRank as any,
        needed_roles: neededRoles as any,
        max_members: parseInt(maxMembers) || 10,
        contacts: buildContacts() as any,
      });
      
      toast.success('Squad updated!');
      navigate(`/squad/${id}`);
    } catch (error: any) {
      toast.error('Failed to update squad', {
        description: error.message,
      });
    }
  };

  if (squadLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-2xl">
          <div className="flex items-center justify-center py-12">
            <CircuitLoader size="lg" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!squad) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-16 text-center">
          <GlowCard className="p-12 max-w-md mx-auto text-center">
            <h1 className="text-2xl font-display font-bold text-foreground mb-4">Squad not found</h1>
            <Button asChild variant="outline" className="border-[#FF4500]/20 hover:border-[#FF4500]/40">
              <Link to="/squads">Back to Squads</Link>
            </Button>
          </GlowCard>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Back button */}
        <Button variant="ghost" size="sm" asChild className="mb-6 text-muted-foreground hover:text-foreground">
          <Link to={`/squad/${id}`}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Squad
          </Link>
        </Button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#FF4500]/10 border border-[#FF4500]/20 flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#FF4500]" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground tracking-wide">Edit Squad</h1>
            <p className="text-muted-foreground text-sm">Update your squad details</p>
          </div>
        </div>

        {/* Form */}
        <GlowCard>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
            <Label htmlFor="name" className="text-xs font-display uppercase tracking-wider text-muted-foreground">Squad Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your squad name"
              className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-xs font-display uppercase tracking-wider text-muted-foreground">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell players about your squad..."
              className="mt-1.5 min-h-[120px] bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minRank" className="text-xs font-display uppercase tracking-wider text-muted-foreground">Minimum Rank Required <span className="text-xs text-muted-foreground">(Optional)</span></Label>
              <Select value={minRank} onValueChange={setMinRank}>
                <SelectTrigger className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20">
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
              <Label htmlFor="maxMembers" className="text-xs font-display uppercase tracking-wider text-muted-foreground">Maximum Members</Label>
              <Select value={maxMembers} onValueChange={setMaxMembers}>
                <SelectTrigger className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20">
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
            <Label className="mb-3 block">Positions Looking For <span className="text-xs text-muted-foreground">(Optional)</span></Label>
            <div className="flex flex-wrap gap-3">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 active:scale-95',
                    neededRoles.includes(role.id)
                      ? 'bg-[#FF4500]/10 border-[#FF4500] text-[#FF4500]'
                      : 'bg-[#0a0a0a] border-[#FF4500]/10 text-muted-foreground hover:text-foreground'
                  )}
                >
                  {role.icon}
                  <span>{role.name}</span>
                  {neededRoles.includes(role.id) && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <Label className="mb-3 block">Squad Contact Info</Label>

            <div>
              <Label htmlFor="whatsapp" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                WhatsApp Number * <span className="text-xs text-muted-foreground">(Required)</span>
              </Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="e.g., +91 98765 43210"
                className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
              />
            </div>

            <div>
              <Label htmlFor="discord" className="text-xs font-display uppercase tracking-wider text-muted-foreground">
                Discord Server <span className="text-xs text-muted-foreground">(Optional)</span>
              </Label>
              <Input
                id="discord"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="e.g., discord.gg/invite"
                className="mt-1.5 bg-[#0a0a0a] border-[#FF4500]/20 focus:border-[#FF4500]/50"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-[#FF4500]/10">
            <Button
              type="submit"
              className="w-full btn-gaming"
              disabled={!canSubmit() || updateSquad.isPending}
            >
              {updateSquad.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Save Changes
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