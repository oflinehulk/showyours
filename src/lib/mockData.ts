// Mock data for frontend development
import type { RankId, RoleId, HeroClassId, ServerId, ContactTypeId } from './constants';

export interface Player {
  id: string;
  ign: string;
  avatar: string;
  rank: RankId;
  winRate: number;
  mainRole: RoleId;
  heroClass: HeroClassId;
  favoriteHeroes: string[];
  server: ServerId;
  bio: string;
  lookingForSquad: boolean;
  contacts: { type: ContactTypeId; value: string }[];
  createdAt: string;
}

export interface Squad {
  id: string;
  name: string;
  logo: string;
  description: string;
  minRank: RankId;
  neededRoles: RoleId[];
  server: ServerId;
  memberCount: number;
  contacts: { type: ContactTypeId; value: string }[];
  createdAt: string;
}

// Mock Players
export const mockPlayers: Player[] = [
  {
    id: '1',
    ign: 'ShadowSlayer99',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=shadow',
    rank: 'mythical-glory',
    winRate: 67.5,
    mainRole: 'jungle',
    heroClass: 'assassin',
    favoriteHeroes: ['Ling', 'Fanny', 'Lancelot'],
    server: 'sea',
    bio: 'Pro jungler looking for competitive team. 3000+ matches, former MCL champion.',
    lookingForSquad: true,
    contacts: [
      { type: 'discord', value: 'ShadowSlayer#1234' },
      { type: 'game-id', value: '123456789 (1234)' },
    ],
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    ign: 'TankGod_PH',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=tank',
    rank: 'mythic',
    winRate: 58.2,
    mainRole: 'roam',
    heroClass: 'tank',
    favoriteHeroes: ['Khufra', 'Atlas', 'Tigreal'],
    server: 'sea',
    bio: 'Dedicated roamer with 5000+ tank matches. I protect my carries!',
    lookingForSquad: true,
    contacts: [
      { type: 'facebook', value: 'fb.com/tankgodph' },
      { type: 'game-id', value: '987654321 (5678)' },
    ],
    createdAt: '2024-01-20',
  },
  {
    id: '3',
    ign: 'MidQueenYve',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=queen',
    rank: 'mythical-honor',
    winRate: 62.8,
    mainRole: 'mid',
    heroClass: 'mage',
    favoriteHeroes: ['Yve', 'Pharsa', 'Valentina'],
    server: 'sea',
    bio: 'Mid lane specialist. Global Yve with 2000+ matches.',
    lookingForSquad: true,
    contacts: [
      { type: 'discord', value: 'YveQueen#5555' },
      { type: 'instagram', value: '@midqueenyve' },
    ],
    createdAt: '2024-02-01',
  },
  {
    id: '4',
    ign: 'GoldCarry_ID',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=gold',
    rank: 'legend',
    winRate: 55.4,
    mainRole: 'gold',
    heroClass: 'marksman',
    favoriteHeroes: ['Claude', 'Wanwan', 'Beatrix'],
    server: 'sea',
    bio: 'Learning to improve my gold lane skills. Looking for patient teammates.',
    lookingForSquad: true,
    contacts: [
      { type: 'game-id', value: '456789123 (9012)' },
    ],
    createdAt: '2024-02-10',
  },
  {
    id: '5',
    ign: 'ExpKing_MY',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=exp',
    rank: 'mythic',
    winRate: 60.1,
    mainRole: 'exp',
    heroClass: 'fighter',
    favoriteHeroes: ['Yu Zhong', 'Paquito', 'Chou'],
    server: 'sea',
    bio: 'EXP lane fighter main. Can also jungle when needed.',
    lookingForSquad: false,
    contacts: [
      { type: 'discord', value: 'ExpKing#7890' },
    ],
    createdAt: '2024-02-15',
  },
  {
    id: '6',
    ign: 'ProSupport_SG',
    avatar: 'https://api.dicebear.com/7.x/adventurer/svg?seed=support',
    rank: 'mythical-glory',
    winRate: 64.3,
    mainRole: 'roam',
    heroClass: 'support',
    favoriteHeroes: ['Angela', 'Mathilda', 'Floryn'],
    server: 'sea',
    bio: 'Support main who makes carries shine. 4000+ support matches.',
    lookingForSquad: true,
    contacts: [
      { type: 'discord', value: 'ProSupport#1111' },
      { type: 'twitter', value: '@prosupport_sg' },
    ],
    createdAt: '2024-02-20',
  },
];

// Mock Squads
export const mockSquads: Squad[] = [
  {
    id: '1',
    name: 'Phoenix Rising',
    logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=phoenix',
    description: 'Competitive team looking for skilled players. We practice daily and participate in tournaments.',
    minRank: 'mythic',
    neededRoles: ['jungle', 'mid'],
    server: 'sea',
    memberCount: 3,
    contacts: [
      { type: 'discord', value: 'discord.gg/phoenixrising' },
    ],
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    name: 'Shadow Warriors',
    logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=shadow',
    description: 'Casual but dedicated team. We play ranked every night. Friendly atmosphere!',
    minRank: 'legend',
    neededRoles: ['gold', 'roam'],
    server: 'sea',
    memberCount: 3,
    contacts: [
      { type: 'facebook', value: 'fb.com/groups/shadowwarriors' },
      { type: 'discord', value: 'ShadowWarriors#0001' },
    ],
    createdAt: '2024-01-25',
  },
  {
    id: '3',
    name: 'Elite Gamers PH',
    logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=elite',
    description: 'Filipino squad looking for more players. We speak Tagalog and English.',
    minRank: 'epic',
    neededRoles: ['exp', 'jungle', 'roam'],
    server: 'sea',
    memberCount: 2,
    contacts: [
      { type: 'discord', value: 'EliteGamersPH#2222' },
    ],
    createdAt: '2024-02-05',
  },
  {
    id: '4',
    name: 'Dragon Slayers',
    logo: 'https://api.dicebear.com/7.x/shapes/svg?seed=dragon',
    description: 'Tournament focused team. Must have mic and be available for scrims.',
    minRank: 'mythical-honor',
    neededRoles: ['mid'],
    server: 'sea',
    memberCount: 4,
    contacts: [
      { type: 'discord', value: 'discord.gg/dragonslayers' },
    ],
    createdAt: '2024-02-12',
  },
];

// Stats for homepage
export const mockStats = {
  totalPlayers: 1234,
  activeSquads: 89,
  matchesMade: 456,
};
