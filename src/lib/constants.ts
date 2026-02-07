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

// Indian states for player location
export const INDIAN_STATES = [
  { id: 'andhra-pradesh', name: 'Andhra Pradesh' },
  { id: 'arunachal-pradesh', name: 'Arunachal Pradesh' },
  { id: 'assam', name: 'Assam' },
  { id: 'bihar', name: 'Bihar' },
  { id: 'chhattisgarh', name: 'Chhattisgarh' },
  { id: 'goa', name: 'Goa' },
  { id: 'gujarat', name: 'Gujarat' },
  { id: 'haryana', name: 'Haryana' },
  { id: 'himachal-pradesh', name: 'Himachal Pradesh' },
  { id: 'jharkhand', name: 'Jharkhand' },
  { id: 'karnataka', name: 'Karnataka' },
  { id: 'kerala', name: 'Kerala' },
  { id: 'madhya-pradesh', name: 'Madhya Pradesh' },
  { id: 'maharashtra', name: 'Maharashtra' },
  { id: 'manipur', name: 'Manipur' },
  { id: 'meghalaya', name: 'Meghalaya' },
  { id: 'mizoram', name: 'Mizoram' },
  { id: 'nagaland', name: 'Nagaland' },
  { id: 'odisha', name: 'Odisha' },
  { id: 'punjab', name: 'Punjab' },
  { id: 'rajasthan', name: 'Rajasthan' },
  { id: 'sikkim', name: 'Sikkim' },
  { id: 'tamil-nadu', name: 'Tamil Nadu' },
  { id: 'telangana', name: 'Telangana' },
  { id: 'tripura', name: 'Tripura' },
  { id: 'uttar-pradesh', name: 'Uttar Pradesh' },
  { id: 'uttarakhand', name: 'Uttarakhand' },
  { id: 'west-bengal', name: 'West Bengal' },
  { id: 'delhi', name: 'Delhi' },
  { id: 'chandigarh', name: 'Chandigarh' },
  { id: 'jammu-kashmir', name: 'Jammu & Kashmir' },
  { id: 'ladakh', name: 'Ladakh' },
] as const;

export type StateId = typeof INDIAN_STATES[number]['id'];

// Server is always Asia for India
export const SERVERS = [
  { id: 'sea', name: 'Southeast Asia (India)' },
] as const;

export type ServerId = typeof SERVERS[number]['id'];

export const CONTACT_TYPES = [
  { id: 'game-id', name: 'In-Game ID', icon: 'gamepad', required: true },
  { id: 'whatsapp', name: 'WhatsApp', icon: 'phone', required: true },
  { id: 'discord', name: 'Discord', icon: 'discord', required: false },
  { id: 'instagram', name: 'Instagram', icon: 'instagram', required: false },
  { id: 'facebook', name: 'Facebook', icon: 'facebook', required: false },
  { id: 'twitter', name: 'Twitter/X', icon: 'twitter', required: false },
] as const;

export type ContactTypeId = typeof CONTACT_TYPES[number]['id'];

// Complete MLBB Hero List (as of 2026)
export const MLBB_HEROES = {
  tank: [
    'Akai', 'Alice', 'Atlas', 'Baxia', 'Belerick', 'Carmilla', 'Chip', 'Edith',
    'Esmeralda', 'Franco', 'Fredrinn', 'Gatotkaca', 'Gloo', 'Grock', 'Hilda',
    'Hylos', 'Johnson', 'Khufra', 'Lolita', 'Masha', 'Minotaur', 'Ruby', 'Tigreal',
    'Uranus'
  ],
  fighter: [
    'Aldous', 'Alpha', 'Argus', 'Arlott', 'Aulus', 'Badang', 'Balmond', 'Barats',
    'Benedetta', 'Chou', 'Dyrroth', 'Fredrinn', 'Guinevere', 'Hilda', 'Jawhead',
    'Julian', 'Kaja', 'Khaleed', 'Lapu-Lapu', 'Leomord', 'Martis', 'Masha',
    'Minsitthar', 'Paquito', 'Phoveus', 'Roger', 'Ruby', 'Silvanna', 'Sun',
    'Terizla', 'Thamuz', 'X.Borg', 'Yin', 'Yu Zhong', 'Zilong'
  ],
  assassin: [
    'Aamon', 'Alucard', 'Benedetta', 'Fanny', 'Gusion', 'Hanzo', 'Harley',
    'Hayabusa', 'Helcurt', 'Joy', 'Kadita', 'Karina', 'Lancelot', 'Ling',
    'Natalia', 'Nolan', 'Saber', 'Selena', 'Suyou', 'Yi Sun-shin', 'Zilong'
  ],
  mage: [
    'Aurora', 'Cecilion', 'Chang\'e', 'Cyclops', 'Esmeralda', 'Eudora', 'Faramis',
    'Gord', 'Harith', 'Harley', 'Kadita', 'Kagura', 'Lunox', 'Luo Yi', 'Lylia',
    'Nana', 'Novaria', 'Odette', 'Pharsa', 'Valentina', 'Vale', 'Valir', 'Vexana',
    'Xavier', 'Yve', 'Zhask', 'Zhuxin', 'Zetian'
  ],
  marksman: [
    'Beatrix', 'Brody', 'Bruno', 'Claude', 'Clint', 'Granger', 'Hanabi', 'Ixia',
    'Irithel', 'Karrie', 'Kimmy', 'Layla', 'Lesley', 'Melissa', 'Miya', 'Moskov',
    'Natan', 'Popol and Kupa', 'Roger', 'Wanwan', 'Yi Sun-shin'
  ],
  support: [
    'Angela', 'Diggie', 'Estes', 'Faramis', 'Floryn', 'Johnson', 'Kaja', 'Lolita',
    'Mathilda', 'Minotaur', 'Rafaela', 'Carmilla'
  ]
} as const;

// Flattened hero list for search/selection
export const ALL_HEROES = [
  ...new Set([
    ...MLBB_HEROES.tank,
    ...MLBB_HEROES.fighter,
    ...MLBB_HEROES.assassin,
    ...MLBB_HEROES.mage,
    ...MLBB_HEROES.marksman,
    ...MLBB_HEROES.support
  ])
].sort() as string[];

// Legacy export for backward compatibility
export const POPULAR_HEROES = ALL_HEROES;
