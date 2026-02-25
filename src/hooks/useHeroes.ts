import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Hero {
  id: string;
  name: string;
  hero_class: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useHeroes() {
  return useQuery({
    queryKey: ['heroes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('heroes')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      return data as Hero[];
    },
  });
}

export function useAllHeroes() {
  return useQuery({
    queryKey: ['allHeroes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('heroes')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      return data as Hero[];
    },
  });
}

export function useHeroesByClass(heroClass: string) {
  return useQuery({
    queryKey: ['heroes', heroClass],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('heroes')
        .select('*')
        .eq('hero_class', heroClass)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      return data as Hero[];
    },
    enabled: !!heroClass,
  });
}

export function useAddHero() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, hero_class }: { name: string; hero_class: string }) => {
      const { data, error } = await supabase
        .from('heroes')
        .insert({ name: name.trim(), hero_class })
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Hero;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heroes'] });
      queryClient.invalidateQueries({ queryKey: ['allHeroes'] });
    },
  });
}

export function useUpdateHero() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, hero_class, is_active }: { id: string; name?: string; hero_class?: string; is_active?: boolean }) => {
      const updateData: Partial<Hero> = {};
      if (name !== undefined) updateData.name = name.trim();
      if (hero_class !== undefined) updateData.hero_class = hero_class;
      if (is_active !== undefined) updateData.is_active = is_active;

      const { data, error } = await supabase
        .from('heroes')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as Hero;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heroes'] });
      queryClient.invalidateQueries({ queryKey: ['allHeroes'] });
    },
  });
}

export function useDeleteHero() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('heroes')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['heroes'] });
      queryClient.invalidateQueries({ queryKey: ['allHeroes'] });
    },
  });
}
