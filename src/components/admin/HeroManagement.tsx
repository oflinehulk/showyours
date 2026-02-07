import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, Search } from 'lucide-react';
import { useAllHeroes, useAddHero, useUpdateHero, useDeleteHero } from '@/hooks/useHeroes';
import { HERO_CLASSES } from '@/lib/constants';
import { toast } from 'sonner';
import { z } from 'zod';

const heroSchema = z.object({
  name: z.string().trim().min(2, 'Hero name must be at least 2 characters').max(50, 'Hero name must be less than 50 characters'),
  hero_class: z.string().min(1, 'Please select a hero class'),
});

export function HeroManagement() {
  const { data: heroes, isLoading } = useAllHeroes();
  const addHero = useAddHero();
  const updateHero = useUpdateHero();
  const deleteHero = useDeleteHero();

  const [newHeroName, setNewHeroName] = useState('');
  const [newHeroClass, setNewHeroClass] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');

  const handleAddHero = async () => {
    try {
      const validated = heroSchema.parse({ name: newHeroName, hero_class: newHeroClass });
      const { name, hero_class } = validated;
      await addHero.mutateAsync({ name, hero_class });
      toast.success(`Hero "${validated.name}" added successfully`);
      setNewHeroName('');
      setNewHeroClass('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else if (error instanceof Error) {
        if (error.message.includes('duplicate')) {
          toast.error('This hero already exists');
        } else {
          toast.error('Failed to add hero');
        }
      }
    }
  };

  const handleToggleActive = async (hero: { id: string; name: string; is_active: boolean }) => {
    try {
      await updateHero.mutateAsync({ id: hero.id, is_active: !hero.is_active });
      toast.success(`Hero "${hero.name}" ${hero.is_active ? 'disabled' : 'enabled'}`);
    } catch (error) {
      toast.error('Failed to update hero');
    }
  };

  const handleDeleteHero = async (hero: { id: string; name: string }) => {
    try {
      await deleteHero.mutateAsync(hero.id);
      toast.success(`Hero "${hero.name}" deleted`);
    } catch (error) {
      toast.error('Failed to delete hero');
    }
  };

  const filteredHeroes = heroes?.filter(hero => {
    const matchesSearch = hero.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'all' || hero.hero_class === filterClass;
    return matchesSearch && matchesClass;
  }) || [];

  const heroCount = heroes?.length || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Manage Heroes ({heroCount} total)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Hero */}
        <div className="p-4 border border-border rounded-lg bg-muted/50">
          <h3 className="text-sm font-medium mb-3">Add New Hero</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="Hero name"
                value={newHeroName}
                onChange={(e) => setNewHeroName(e.target.value)}
                maxLength={50}
              />
            </div>
            <div className="w-full sm:w-40">
              <Select value={newHeroClass} onValueChange={setNewHeroClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Class" />
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
            <Button
              onClick={handleAddHero}
              disabled={addHero.isPending || !newHeroName.trim() || !newHeroClass}
            >
              {addHero.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add Hero
            </Button>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search heroes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {HERO_CLASSES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.icon} {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Heroes Table */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading heroes...</div>
        ) : filteredHeroes.length > 0 ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHeroes.map((hero) => (
                  <TableRow key={hero.id}>
                    <TableCell className="font-medium">{hero.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {HERO_CLASSES.find(c => c.id === hero.hero_class)?.icon} {hero.hero_class}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={hero.is_active}
                        onCheckedChange={() => handleToggleActive(hero)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Hero</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{hero.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteHero(hero)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery || filterClass !== 'all' ? 'No heroes match your filters' : 'No heroes found'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
