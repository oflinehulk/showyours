import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, X } from 'lucide-react';
import { useAdminAssignRole, useAdminRemoveRole } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AdminRoleManagerProps {
  userId: string;
  ign: string;
}

const AVAILABLE_ROLES = ['admin', 'moderator', 'user'] as const;

export function AdminRoleManager({ userId, ign }: AdminRoleManagerProps) {
  const queryClient = useQueryClient();
  const assignRole = useAdminAssignRole();
  const removeRole = useAdminRemoveRole();
  const [newRole, setNewRole] = useState<string>('');

  const { data: roles = [] } = useQuery({
    queryKey: ['userRoles', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
      return data.map(r => r.role);
    },
  });

  const handleAssign = async () => {
    if (!newRole) return;
    try {
      await assignRole.mutateAsync({ userId, role: newRole as 'admin' | 'moderator' | 'user' });
      queryClient.invalidateQueries({ queryKey: ['userRoles', userId] });
      toast.success(`Assigned ${newRole} role to ${ign}`);
      setNewRole('');
    } catch {
      toast.error('Failed to assign role');
    }
  };

  const handleRemove = async (role: string) => {
    try {
      await removeRole.mutateAsync({ userId, role: role as 'admin' | 'moderator' | 'user' });
      queryClient.invalidateQueries({ queryKey: ['userRoles', userId] });
      toast.success(`Removed ${role} role from ${ign}`);
    } catch {
      toast.error('Failed to remove role');
    }
  };

  const availableToAdd = AVAILABLE_ROLES.filter(r => !roles.includes(r));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {roles.map(role => (
          <Badge key={role} variant="outline" className="border-[#FF4500]/30 gap-1">
            {role}
            <button onClick={() => handleRemove(role)} className="hover:text-destructive" disabled={removeRole.isPending}>
              {removeRole.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            </button>
          </Badge>
        ))}
        {roles.length === 0 && <span className="text-xs text-muted-foreground">No roles</span>}
      </div>
      {availableToAdd.length > 0 && (
        <div className="flex gap-1">
          <Select value={newRole} onValueChange={setNewRole}>
            <SelectTrigger className="bg-[#0a0a0a] border-[#FF4500]/20 h-7 text-xs w-28"><SelectValue placeholder="Add role" /></SelectTrigger>
            <SelectContent>
              {availableToAdd.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={handleAssign} disabled={!newRole || assignRole.isPending} className="h-7 px-2 border-[#FF4500]/20">
            {assignRole.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
          </Button>
        </div>
      )}
    </div>
  );
}
