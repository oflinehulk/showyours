import { ROLES } from '@/lib/constants';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface MultiRoleSelectProps {
  selectedRoles: string[];
  onRolesChange: (roles: string[]) => void;
  disabled?: boolean;
}

export function MultiRoleSelect({ selectedRoles, onRolesChange, disabled }: MultiRoleSelectProps) {
  const handleRoleToggle = (roleId: string) => {
    if (selectedRoles.includes(roleId)) {
      onRolesChange(selectedRoles.filter(r => r !== roleId));
    } else {
      onRolesChange([...selectedRoles, roleId]);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Select all roles you can play (at least one required)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ROLES.map((role) => {
          const isSelected = selectedRoles.includes(role.id);
          return (
            <label
              key={role.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                isSelected 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-card border-border hover:border-primary/50',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => !disabled && handleRoleToggle(role.id)}
                disabled={disabled}
              />
              <div className="flex items-center gap-2">
                <span className="text-lg">{role.icon}</span>
                <div>
                  <div className="font-medium text-sm">{role.name}</div>
                  <div className="text-xs text-muted-foreground">{role.description}</div>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
