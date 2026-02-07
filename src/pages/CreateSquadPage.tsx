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
import { useAuth } from '@/contexts/AuthContext';
import { useCreateSquad } from '@/hooks/useSquads';
import { RANKS, ROLES, SERVERS, CONTACT_TYPES } from '@/lib/constants';
import { ArrowLeft, Plus, X, Check, Shield, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function CreateSquadPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createSquad = useCreateSquad();
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [minRank, setMinRank] = useState('');
  const [server, setServer] = useState('');
  const [neededRoles, setNeededRoles] = useState<string[]>([]);
  const [memberCount, setMemberCount] = useState('1');
  const [contacts, setContacts] = useState<{ type: string; value: string }[]>([]);
  const [newContactType, setNewContactType] = useState('discord');
  const [newContactValue, setNewContactValue] = useState('');

  useEffect(() => {
    if (!user) {
      toast.error('Please sign in to create a squad');
      navigate('/auth');
    }
  }, [user, navigate]);

  const toggleRole = (roleId: string) => {
    if (neededRoles.includes(roleId)) {
      setNeededRoles(neededRoles.filter((r) => r !== roleId));
    } else {
      setNeededRoles([...neededRoles, roleId]);
    }
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

  const canSubmit = () => {
    return (
      name.trim() &&
      description.trim() &&
      minRank &&
      server &&
      neededRoles.length > 0 &&
      contacts.length > 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await createSquad.mutateAsync({
        name: name.trim(),
        description: description.trim(),
        min_rank: minRank as any,
        server: server as any,
        needed_roles: neededRoles as any,
        member_count: parseInt(memberCount) || 1,
        contacts: contacts as any,
        is_recruiting: true,
      });
      
      toast.success('Squad listing created!', {
        description: 'Players can now find your squad.',
      });
      navigate('/squads');
    } catch (error: any) {
      toast.error('Failed to create squad', {
        description: error.message,
      });
    }
  };

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
              <h1 className="text-3xl font-bold text-foreground">Post Squad Listing</h1>
              <p className="text-muted-foreground">Recruit new members for your team</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-6">
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
              <Label htmlFor="server">Server *</Label>
              <Select value={server} onValueChange={setServer}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select server" />
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
              <Label htmlFor="memberCount">Current Members</Label>
              <Select value={memberCount} onValueChange={setMemberCount}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="How many?" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} member{n > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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

          {/* Needed Roles */}
          <div>
            <Label className="mb-3 block">Positions Needed *</Label>
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

          {/* Contact Info */}
          <div>
            <Label className="mb-3 block">Contact Info *</Label>
            <p className="text-sm text-muted-foreground mb-3">
              Add at least one way for players to reach your squad
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
                placeholder="Enter link or username"
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
              <div className="space-y-2 mt-4">
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
                        type="button"
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
                  Post Squad Listing
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
