// MLBB Game Constants

export const RANKS = [
  { id: 'warrior', name: 'Warrior', tier: 1 },
  { id: 'elite', name: 'Elite', tier: 2 },
  { id: 'master', name: 'Master', tier: 3 },
  { id: 'grandmaster', name: 'Grandmaster', tier: 4 },
  { id: 'epic', name: 'Epic', tier: 5 },
  { id: 'legend', name: 'Legend', tier: 6 },
  { id: 'mythic', name: 'Mythic', tier: 7 },
  { id: 'mythical-honor', name: 'Mythical Honor', tier: 8 },
  { id: 'mythical-glory', name: 'Mythical Glory', tier: 9 },
  { id: 'immortal', name: 'Immortal', tier: 10 },
] as const;

export type RankId = typeof RANKS[number]['id'];

export const ROLES = [
  { id: 'gold', name: 'Gold Lane', icon: '🥇', description: 'Carry in the gold lane' },
  { id: 'exp', name: 'EXP Lane', icon: '⚔️', description: 'Offlaner in the experience lane' },
  { id: 'mid', name: 'Mid Lane', icon: '🎯', description: 'Mage in the middle lane' },
  { id: 'roam', name: 'Roam', icon: '🛡️', description: 'Support and tank roaming' },
  { id: 'jungle', name: 'Jungle', icon: '🌲', description: 'Jungler assassin or fighter' },
] as const;

export type RoleId = typeof ROLES[number]['id'];

export const HERO_CLASSES = [
  { id: 'tank', name: 'Tank', icon: '🛡️' },
  { id: 'fighter', name: 'Fighter', icon: '⚔️' },
  { id: 'assassin', name: 'Assassin', icon: '🗡️' },
  { id: 'mage', name: 'Mage', icon: '🔮' },
  { id: 'marksman', name: 'Marksman', icon: '🏹' },
  { id: 'support', name: 'Support', icon: '💚' },
] as const;

export type HeroClassId = typeof HERO_CLASSES[number]['id'];

export const SERVERS = [
  { id: 'sea', name: 'Southeast Asia' },
  { id: 'na', name: 'North America' },
  { id: 'eu', name: 'Europe' },
  { id: 'sa', name: 'South America' },
  { id: 'mena', name: 'MENA' },
] as const;

export type ServerId = typeof SERVERS[number]['id'];

export const CONTACT_TYPES = [
  { id: 'discord', name: 'Discord', icon: 'discord' },
  { id: 'facebook', name: 'Facebook', icon: 'facebook' },
  { id: 'game-id', name: 'Game ID', icon: 'gamepad' },
  { id: 'instagram', name: 'Instagram', icon: 'instagram' },
  { id: 'twitter', name: 'Twitter/X', icon: 'twitter' },
] as const;

export type ContactTypeId = typeof CONTACT_TYPES[number]['id'];

// Popular heroes for the mock data
export const POPULAR_HEROES = [
  'Layla', 'Miya', 'Zilong', 'Tigreal', 'Nana',
  'Alucard', 'Gusion', 'Ling', 'Fanny', 'Chou',
  'Lancelot', 'Hayabusa', 'Kagura', 'Lunox', 'Esmeralda',
  'Claude', 'Granger', 'Bruno', 'Wanwan', 'Beatrix',
  'Johnson', 'Khufra', 'Atlas', 'Hylos', 'Grock',
  'Angela', 'Estes', 'Rafaela', 'Mathilda', 'Floryn',
  'Yu Zhong', 'Paquito', 'Phoveus', 'Dyrroth', 'Thamuz',
  'Pharsa', 'Yve', 'Valentina', 'Xavier', 'Kadita',
] as const;
