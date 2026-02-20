import type { RankId, RoleId, HeroClassId, ServerId, ContactTypeId, StateId } from './constants';
import type { Json } from '@/integrations/supabase/types';

export interface Contact {
  type: ContactTypeId;
  value: string;
}

export interface Profile {
  id: string;
  user_id: string;
  ign: string;
  avatar_url: string | null;
  rank: string;
  win_rate: number | null;
  main_role: string;
  main_roles?: string[];
  hero_class: string;
  favorite_heroes: string[];
  server: string;
  state: string | null;
  bio: string | null;
  looking_for_squad: boolean;
  contacts: Json;
  screenshots: string[];
  mlbb_id: string | null;
  has_completed_onboarding: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface Squad {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  min_rank: string;
  needed_roles: string[];
  server: string;
  member_count: number;
  max_members: number | null;
  contacts: Json;
  is_recruiting: boolean;
  created_at: string;
  updated_at: string;
}
