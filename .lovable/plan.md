
# MLBB Player Recruitment Platform - Frontend Plan

## 🎮 Overview
A dark-themed, gaming-aesthetic website where Mobile Legends: Bang Bang players can showcase their stats and squads can find/recruit players.

---

## 📄 Pages to Build

### 1. **Homepage / Landing Page**
- Hero section with catchy tagline ("Find Your Squad" or similar)
- Quick stats (total players, active squads)
- Featured players carousel
- Call-to-action buttons: "Create Profile" & "Post Squad Listing"

### 2. **Player Directory**
- Grid of player cards showing avatar, rank badge, role, win rate
- **Filters**: Rank, Role (5 positions), Hero Class, Server
- **Search**: By player name or hero
- **Sort**: By win rate, rank, recently added
- **Rankings**: Leaderboard view option

### 3. **Player Profile Page**
- Large hero banner with avatar and IGN (in-game name)
- Stats display: Rank, Win Rate, Main Role, Hero Class
- Favorite heroes section (with hero icons)
- Contact info section (Discord, Facebook, Game ID - player chooses what to show)
- "Looking for Squad" status toggle
- Bio/description area

### 4. **Squad Listings Page**
- Cards showing squad name, requirements, open positions
- Filter by: Required rank, needed roles
- Each listing shows contact info

### 5. **Squad Listing Detail / Post Form**
- Squad name, description, requirements
- Open positions needed (roles)
- Minimum rank requirement
- Contact information

### 6. **Create/Edit Player Profile Form**
- Step-by-step form: Basic Info → Stats → Heroes → Contact
- Preview before "submitting"

---

## 🎨 Design System
- **Theme**: Dark background (#0a0a0f) with neon accent colors (cyan, purple, gold)
- **Cards**: Glassmorphism effect with subtle glow on hover
- **Rank Badges**: Colored badges matching MLBB rank colors (Warrior → Mythical Glory)
- **Typography**: Bold, gaming-style headers with clean body text
- **Animations**: Subtle hover effects, smooth transitions

---

## 🔧 Technical Approach
- Static data/mock data for now (we'll connect backend later)
- Responsive design (mobile-first since MLBB players often browse on phone)
- All free: React + Tailwind CSS (already set up in your project)

---

## 📝 Step-by-Step Build Order
1. Set up design system (colors, components)
2. Build reusable components (PlayerCard, RankBadge, etc.)
3. Create Homepage
4. Build Player Directory with filters
5. Create Player Profile page
6. Build Squad Listings page
7. Add Create Profile form
8. Add Create Squad Listing form
9. Polish animations and responsive design

---

After frontend is complete, we'll add Supabase (free tier) for:
- User authentication
- Player profiles database
- Squad listings database
- Real data storage
