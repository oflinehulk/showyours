import type { RankId, RoleId, HeroClassId, ServerId, ContactTypeId } from './constants';

export interface Profile {
  id: string;
  user_id: string;
  ign: string;
  avatar_url: string | null;
  rank: RankId;
  win_rate: number | null;
  main_role: RoleId;
  hero_class: HeroClassId;
  favorite_heroes: string[];
  server: ServerId;
  bio: string | null;
  looking_for_squad: boolean;
  contacts: { type: ContactTypeId; value: string }[];
  created_at: string;
  updated_at: string;
}

export interface Squad {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  min_rank: RankId;
  needed_roles: RoleId[];
  server: ServerId;
  member_count: number;
  contacts: { type: ContactTypeId; value: string }[];
  is_recruiting: boolean;
  created_at: string;
  updated_at: string;
}
