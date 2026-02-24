import { useState, useRef, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { GlowCard } from '@/components/tron/GlowCard';
import { cn } from '@/lib/utils';
import { useSEO } from '@/hooks/useSEO';
import {
  BookOpen,
  Trophy,
  Users,
  ClipboardList,
  Shuffle,
  AlertTriangle,
  ChevronRight,
  Search,
  Layers,
  Bell,
  Calendar,
  Sparkles,
} from 'lucide-react';

const SECTIONS = [
  { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
  { id: 'for-players', label: 'For Players', icon: Users },
  { id: 'for-hosts', label: 'For Hosts', icon: Trophy },
  { id: 'tournament-lifecycle', label: 'Tournament Lifecycle', icon: ClipboardList },
  { id: 'brackets-scoring', label: 'Brackets & Scoring', icon: Shuffle },
  { id: 'multi-stage', label: 'Multi-Stage', icon: Layers },
  { id: 'draw-cointoss', label: 'Draw & Coin Toss', icon: Sparkles },
  { id: 'match-scheduling', label: 'Match Scheduling', icon: Calendar },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'disputes-forfeits', label: 'Disputes & Forfeits', icon: AlertTriangle },
  { id: 'faq', label: 'FAQ', icon: Search },
] as const;

export default function DocsPage() {
  useSEO({
    title: 'Documentation',
    description: 'Learn how to use ShowYours — guides for players and tournament hosts.',
    path: '/docs',
  });

  const [activeSection, setActiveSection] = useState<string>('getting-started');
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Scroll the mobile nav to keep active tab visible
  useEffect(() => {
    if (!mobileNavRef.current) return;
    const activeBtn = mobileNavRef.current.querySelector(`[data-section="${activeSection}"]`);
    if (activeBtn) {
      (activeBtn as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeSection]);

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-display font-bold text-foreground tracking-wide mb-2">Documentation</h1>
          <p className="text-muted-foreground">Everything you need to know about using ShowYours.</p>
        </div>

        {/* Mobile nav — horizontal scroll tabs */}
        <div
          ref={mobileNavRef}
          className="lg:hidden flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide -mx-4 px-4"
        >
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              data-section={s.id}
              onClick={() => scrollToSection(s.id)}
              className={cn(
                'flex items-center gap-1.5 whitespace-nowrap px-3 py-2 rounded-full text-xs font-medium transition-colors shrink-0 border',
                activeSection === s.id
                  ? 'bg-[#FF4500]/10 text-[#FF4500] border-[#FF4500]/30'
                  : 'text-muted-foreground border-border hover:text-foreground hover:bg-muted/50'
              )}
            >
              <s.icon className="w-3 h-3 shrink-0" />
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex gap-8">
          {/* Sidebar — desktop only */}
          <nav className="hidden lg:block w-48 shrink-0 sticky top-20 self-start">
            <ul className="space-y-1">
              {SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => scrollToSection(s.id)}
                    className={cn(
                      'flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm transition-colors',
                      activeSection === s.id
                        ? 'bg-[#FF4500]/10 text-[#FF4500] font-medium'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    )}
                  >
                    <s.icon className="w-3.5 h-3.5 shrink-0" />
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* Getting Started */}
            <DocSection id="getting-started" title="Getting Started" icon={BookOpen}>
              <p>
                ShowYours is a competitive Mobile Legends: Bang Bang (MLBB) community platform.
                You can create a player profile, form or join squads, and compete in organized tournaments.
              </p>
              <h4>Quick Start</h4>
              <ol>
                <li><strong>Create an account</strong> — Sign up with your email on the Auth page.</li>
                <li><strong>Set up your profile</strong> — Add your IGN (In-Game Name), MLBB ID, preferred role, and hero pool.</li>
                <li><strong>Join or create a squad</strong> — Browse existing squads or create your own (5 members + substitutes).</li>
                <li><strong>Register for tournaments</strong> — Find open tournaments and register your squad.</li>
              </ol>
            </DocSection>

            {/* For Players */}
            <DocSection id="for-players" title="For Players" icon={Users}>
              <h4>Player Profile</h4>
              <p>
                Your profile showcases your IGN, MLBB ID, main role (EXP, Jungle, Mid, Gold, Roam), and hero pool.
                Other players can view your profile to find teammates.
              </p>

              <h4>Squads</h4>
              <p>
                Squads are teams of 5-7 players. The squad leader manages the roster, invites members, and registers for tournaments.
                Each member has a position (1-5) and role assignment.
              </p>
              <ul>
                <li>You can be in multiple squads simultaneously.</li>
                <li>Squad leaders can invite players directly or share invite links.</li>
                <li>Members can be added manually by the leader even if they don't have a ShowYours account.</li>
              </ul>

              <h4>Invitations</h4>
              <p>
                You receive invitations in your <strong>Invitation Inbox</strong> (bell icon in the header). There are two types:
              </p>
              <ul>
                <li><strong>Squad invitations</strong> — A squad leader invites you to join their team. Accept to be added to the roster.</li>
                <li><strong>Tournament invitations</strong> — A host invites your squad to register for a tournament. Accepting automatically registers your squad if it meets the minimum roster requirement (5 members).</li>
              </ul>

              <h4>Tournament Registration</h4>
              <p>
                To compete in a tournament, your squad leader registers through the tournament page.
                The host reviews and approves registrations. Once approved, your squad appears in the bracket.
              </p>
              <ul>
                <li>The same MLBB ID cannot be registered in multiple squads within the same tournament.</li>
                <li>Roster changes (player substitutions) require host approval and are limited to 2 per squad per tournament.</li>
              </ul>

              <h4>During a Tournament</h4>
              <ul>
                <li><strong>Check-in</strong> — The host may require check-in before matches. If your squad doesn't check in, you may be forfeited.</li>
                <li><strong>Coin toss</strong> — Before a match, the host may run a coin toss to determine which team picks their side (Blue or Red). Watch the animated coin flip live.</li>
                <li><strong>Disputes</strong> — If you believe a match result is incorrect, the squad leader can raise a dispute from the match card. Provide a clear reason — the host will review and resolve it.</li>
                <li><strong>Share results</strong> — After a match completes, use the share button to generate a result card image with team logos and scores.</li>
              </ul>
            </DocSection>

            {/* For Hosts */}
            <DocSection id="for-hosts" title="For Tournament Hosts" icon={Trophy}>
              <h4>Creating a Tournament</h4>
              <p>
                Go to <strong>Tournaments → Create Tournament</strong>. Fill in:
              </p>
              <ul>
                <li><strong>Name & description</strong> — Give your tournament a clear title and rules description. The rich text editor supports formatting, links, and images.</li>
                <li><strong>Game & mode</strong> — Select the game type and mode.</li>
                <li><strong>Date & time</strong> — Set the start date/time.</li>
                <li><strong>Max squads</strong> — Set the maximum number of teams (e.g., 8, 16, 32).</li>
                <li><strong>Multi-stage toggle</strong> — Enable for group stage + knockout format (any squad count, minimum 4).</li>
                <li><strong>Prize pool & tiers</strong> — Define the total prize and breakdown (1st place, 2nd place, MVP, etc.).</li>
              </ul>

              <h4>Inviting Squads</h4>
              <p>
                You can directly invite specific squads to your tournament from the <strong>Invite Squads</strong> tab.
                Invited squads receive a notification and can accept with one click. You can also cancel pending invitations.
              </p>

              <h4>Managing Registrations</h4>
              <p>
                When squads register, their status is <strong>pending</strong> by default.
                Review each registration and approve or reject it. You can view the squad's roster before approving.
              </p>

              <h4>Host Controls</h4>
              <p>
                The Host Controls panel shows a <strong>step progress indicator</strong> guiding you through each stage.
                Only the actions relevant to the current stage are shown:
              </p>
              <ol>
                <li><strong>Registration Open</strong> — Accept registrations. Close registration when ready.</li>
                <li><strong>Registration Closed</strong> — Configure seeding (auto or manual), choose format (Single/Double Elimination, Round Robin), then generate the bracket.</li>
                <li><strong>Bracket Generated</strong> — Review the bracket. Start the tournament when teams are ready.</li>
                <li><strong>Ongoing</strong> — Enter match scores, run coin tosses, schedule matches, handle forfeits and disputes. Mark completed when all matches are done.</li>
                <li><strong>Completed</strong> — View final standings, mark prize distribution.</li>
              </ol>

              <h4>Seeding</h4>
              <p>
                Before generating the bracket, you can assign seed numbers to approved squads.
                Seeds determine bracket placement (seed 1 vs highest seed, etc.).
                Use "Auto-seed" to assign seeds by registration order, or set them manually.
                Leave seeds empty for random placement.
              </p>

              <h4>Entering Scores</h4>
              <p>
                Click any match card in the bracket to open the score sheet.
                Enter scores for each team based on the Best-of format:
              </p>
              <ul>
                <li><strong>Bo1</strong> — Winner: 1, Loser: 0</li>
                <li><strong>Bo3</strong> — Winner: 2, Loser: 0 or 1</li>
                <li><strong>Bo5</strong> — Winner: 3, Loser: 0, 1, or 2</li>
              </ul>
              <p>The system validates scores automatically and advances the winner in the bracket.</p>

              <h4>Roster Changes</h4>
              <p>
                Squad leaders can request player substitutions during a tournament.
                Each squad is limited to <strong>2 approved roster changes</strong>.
                Review them from the Registrations tab — approve or reject each request.
              </p>

              <h4>Activity Log</h4>
              <p>
                The Activity tab shows a timeline of all tournament events — registration status changes, match results, disputes, and status transitions.
                This helps you audit what happened and when.
              </p>
            </DocSection>

            {/* Tournament Lifecycle */}
            <DocSection id="tournament-lifecycle" title="Tournament Lifecycle" icon={ClipboardList}>
              <p>Every tournament follows a strict status flow:</p>
              <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/30 rounded-lg text-sm">
                <StatusStep label="Registration Open" color="text-blue-400" />
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <StatusStep label="Registration Closed" color="text-yellow-400" />
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <StatusStep label="Bracket Generated" color="text-orange-400" />
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <StatusStep label="Ongoing" color="text-[#FF4500]" />
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                <StatusStep label="Completed" color="text-green-400" />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                A tournament can be <strong>cancelled</strong> at any stage (except after completion).
                Cancellation is irreversible and notifies all registered squads.
              </p>

              <h4>Transition Rules</h4>
              <ul>
                <li>You cannot skip stages (e.g., jump from Registration Open to Ongoing).</li>
                <li>Bracket generation requires at least 2 approved squads.</li>
                <li>Completing a tournament requires all matches to be finished.</li>
                <li>Completed and cancelled tournaments cannot be reactivated.</li>
              </ul>
            </DocSection>

            {/* Brackets & Scoring */}
            <DocSection id="brackets-scoring" title="Brackets & Scoring" icon={Shuffle}>
              <h4>Tournament Formats</h4>
              <ul>
                <li><strong>Single Elimination</strong> — Lose once, you're out. Standard bracket tree.</li>
                <li><strong>Double Elimination</strong> — Teams get a second chance through the losers bracket. Final between winners and losers bracket champions.</li>
                <li><strong>Seeded Double Elimination</strong> — Used when advancing from a group stage. Top teams enter the Upper Bracket and bottom-advancing teams enter the Lower Bracket directly. Includes a Semi-Final round and 3rd-place designation.</li>
                <li><strong>Round Robin</strong> — Every team plays every other team in their group. Rankings by points (3 per win), with head-to-head and score difference as tiebreakers.</li>
              </ul>

              <h4>Best-of Format</h4>
              <p>
                Each match can be Bo1, Bo3, or Bo5. Scores must be valid for the format — the system enforces this automatically.
                Finals matches can have a different Best-of setting than regular matches (e.g., Bo3 regular, Bo5 finals).
              </p>

              <h4>Winner Advancement</h4>
              <p>
                When a match is completed, the winner automatically advances to the next round in the bracket.
                In double elimination, the loser moves to the losers bracket instead of being eliminated.
                In seeded double elimination, winners bracket losers drop to specific losers bracket rounds based on their position.
              </p>

              <h4>Group Standings</h4>
              <p>
                During round-robin group stages, standings are calculated automatically:
              </p>
              <ul>
                <li><strong>3 points</strong> per win, 0 per loss</li>
                <li>Ranked by total points, then head-to-head record, then score difference</li>
                <li>Teams advancing to the next stage are highlighted: <strong>green</strong> for upper bracket, <strong>orange</strong> for lower bracket</li>
              </ul>
            </DocSection>

            {/* Multi-Stage */}
            <DocSection id="multi-stage" title="Multi-Stage Tournaments" icon={Layers}>
              <p>
                Multi-stage tournaments let you run a group stage followed by a knockout bracket.
                This is ideal for larger tournaments where you want round-robin group play before elimination rounds.
              </p>

              <h4>Creating a Multi-Stage Tournament</h4>
              <p>
                When creating a tournament, enable the <strong>Multi-Stage Tournament</strong> toggle.
                This allows any squad count (minimum 4) and unlocks stage configuration after registration closes.
              </p>

              <h4>Configuring Stages</h4>
              <p>
                After closing registration, the host configures stages from Host Controls. Each stage has:
              </p>
              <ul>
                <li><strong>Name</strong> — e.g., "Group Stage", "Knockout"</li>
                <li><strong>Format</strong> — Round Robin, Single Elimination, or Double Elimination</li>
                <li><strong>Best-of</strong> — Bo1, Bo3, or Bo5 for regular matches</li>
                <li><strong>Finals Best-of</strong> — Override for the final match (e.g., Bo5 for knockout finals)</li>
              </ul>
              <p>
                For group stages (Round Robin format), you also configure:
              </p>
              <ul>
                <li><strong>Number of groups</strong> — How many groups to divide teams into (up to 26, labeled A-Z)</li>
                <li><strong>Advance per group</strong> — Top N teams from each group advance to upper bracket</li>
                <li><strong>Advance to lower per group</strong> — Next N teams advance to lower bracket (for seeded double elimination)</li>
                <li><strong>Best remaining</strong> — Additional teams from across all groups (e.g., "best 4 third-place teams")</li>
              </ul>

              <h4>Group Assignment</h4>
              <p>
                After configuring stages, assign teams to groups. Three methods are available:
              </p>
              <ul>
                <li><strong>Balanced (snake draft)</strong> — Teams are distributed by seed in a snake pattern for balanced groups.</li>
                <li><strong>Random</strong> — Teams are shuffled randomly into groups.</li>
                <li><strong>Draw Ceremony</strong> — An animated live draw where teams are pulled one by one from a virtual bowl and assigned to groups. Can be streamed live for transparency.</li>
              </ul>
              <p>
                For draw ceremonies, you can optionally use <strong>Pot-Based Seeded Draw</strong> — assign teams to pots (1-4) based on strength, then draw from each pot to ensure every group gets one team from each pot. See the <strong>Draw & Coin Toss</strong> section for details.
              </p>
              <p>You can also drag teams between groups manually before generating the bracket.</p>

              <h4>Advancing to Knockout</h4>
              <p>
                Once all group stage matches are complete, the host clicks <strong>Complete & Start [Next Stage]</strong>.
                The system automatically computes which teams advance based on your advancement rules and generates the elimination bracket.
              </p>
              <p>
                If <strong>Advance to Lower per group</strong> is configured, the system creates a seeded double elimination bracket where upper-bracket and lower-bracket teams start in their respective brackets.
              </p>

              <h4>Example Setup (42 Teams)</h4>
              <ul>
                <li><strong>Stage 1:</strong> Group Stage — 6 groups of 7, Round Robin Bo1. Top 2 per group + best 4 third-place advance.</li>
                <li><strong>Stage 2:</strong> Knockout — 16 teams, Double Elimination Bo3, Grand Final Bo5.</li>
              </ul>

              <h4>Roster Changes</h4>
              <p>
                In multi-stage tournaments, each squad is allowed <strong>2 roster changes per stage</strong> (not per tournament).
                This gives teams flexibility to adjust their lineup between stages.
              </p>
            </DocSection>

            {/* Draw & Coin Toss */}
            <DocSection id="draw-cointoss" title="Draw Ceremony & Coin Toss" icon={Sparkles}>
              <h4>Draw Ceremony</h4>
              <p>
                The Draw Ceremony is an animated group draw experience designed for live streaming or in-person events.
                Teams are drawn one at a time from a virtual bowl and assigned to groups in real time.
              </p>
              <ul>
                <li><strong>Reveal one-by-one</strong> — Click "Reveal Next" to draw each team individually with animation and confetti effects.</li>
                <li><strong>Auto-draw</strong> — Let the system draw all teams automatically with a short delay between each reveal.</li>
                <li><strong>Share result</strong> — After the draw, generate a share card image showing all group assignments with team logos. Download or share it directly.</li>
              </ul>
              <p>
                The draw uses cryptographically secure randomization for fairness. The seed is displayed for reproducibility.
              </p>

              <h4>Pot-Based Seeded Draw</h4>
              <p>
                For competitive fairness, hosts can assign teams to <strong>pots</strong> before the draw.
                This ensures each group gets an even spread of team strengths — similar to FIFA World Cup or UEFA Champions League draws.
              </p>
              <ul>
                <li><strong>Pot 1</strong> (Yellow) — Strongest / highest-seeded teams</li>
                <li><strong>Pot 2</strong> (Blue) — Second tier</li>
                <li><strong>Pot 3</strong> (Green) — Third tier</li>
                <li><strong>Pot 4</strong> (Purple) — Remaining teams</li>
              </ul>
              <p>
                Use drag-and-drop to assign teams to pots, or click "Auto-distribute" for random pot assignment.
                During the draw, teams are pulled pot by pot — guaranteeing no group gets two teams from the same pot.
                Pot badges appear on the share card so everyone can see the seeding.
              </p>

              <h4>Coin Toss</h4>
              <p>
                Before a match, the host can run an interactive <strong>coin toss</strong> to determine side selection.
                This is useful for competitive matches where Blue/Red side matters.
              </p>
              <ul>
                <li>The coin flip uses a 3D animation with sound effects (drum roll, impact, reveal flourish).</li>
                <li>The winning team chooses their preferred side — <strong>Blue</strong> or <strong>Red</strong>.</li>
                <li>The host can re-flip if needed, or swap sides after the result.</li>
                <li>Results are purely random using cryptographic randomization.</li>
              </ul>
            </DocSection>

            {/* Match Scheduling */}
            <DocSection id="match-scheduling" title="Match Scheduling" icon={Calendar}>
              <p>
                Hosts can schedule match times to help teams plan ahead. Access scheduling from the bracket view or Host Controls.
              </p>

              <h4>Manual Scheduling</h4>
              <p>
                Click on any match to set its date and time individually. This is useful for finals or important matches that need specific time slots.
              </p>

              <h4>Auto-Scheduler</h4>
              <p>
                For larger tournaments, use the auto-scheduler to assign times to all matches at once. Configure:
              </p>
              <ul>
                <li><strong>Start date and time</strong> — When the first match begins.</li>
                <li><strong>Matches per day</strong> — How many matches to schedule each day.</li>
                <li><strong>Gap between matches</strong> — Minutes between consecutive matches (to allow for setup, breaks, etc.).</li>
              </ul>
              <p>
                The auto-scheduler distributes matches across days and detects <strong>scheduling conflicts</strong> — it alerts you if the same squad would need to play two overlapping matches (assumes 60-minute match duration).
              </p>

              <h4>Clearing Schedules</h4>
              <p>
                You can clear all scheduled times and start over at any point. Individual match times can also be edited or removed.
              </p>
            </DocSection>

            {/* Notifications */}
            <DocSection id="notifications" title="Notifications & Invitations" icon={Bell}>
              <h4>Notification Bell</h4>
              <p>
                The notification bell in the header shows your unread notification count. Click it to view all notifications.
                Notifications are sent for important tournament events:
              </p>
              <ul>
                <li><strong>Registration approved</strong> — Your squad has been accepted into a tournament.</li>
                <li><strong>Registration rejected</strong> — Your registration was declined by the host.</li>
                <li><strong>Roster change approved/rejected</strong> — A player substitution request was reviewed.</li>
                <li><strong>Tournament cancelled</strong> — A tournament you're registered in has been cancelled.</li>
                <li><strong>Dispute raised</strong> — A match result in your tournament has been disputed.</li>
              </ul>
              <p>
                Click any notification to navigate directly to the relevant tournament. You can mark notifications as read individually or all at once.
              </p>

              <h4>Invitation Inbox</h4>
              <p>
                Separate from notifications, your <strong>Invitation Inbox</strong> collects pending squad and tournament invitations.
                The inbox badge shows how many invitations are waiting for your response.
              </p>
              <ul>
                <li><strong>Squad invitations</strong> — Accept to join the squad's roster, or decline.</li>
                <li><strong>Tournament invitations</strong> — Accepting automatically registers your squad (must have 5+ members). All roster members are registered atomically.</li>
              </ul>
            </DocSection>

            {/* Disputes & Forfeits */}
            <DocSection id="disputes-forfeits" title="Disputes & Forfeits" icon={AlertTriangle}>
              <h4>Raising a Dispute</h4>
              <p>
                Squad leaders can dispute a completed match result by clicking the actions menu (three dots) on the match card.
                Provide a clear reason explaining the issue. The match status changes to "Disputed" until the host resolves it.
              </p>

              <h4>Resolving a Dispute</h4>
              <p>
                As a host, click "Resolve Dispute" from the match card dropdown. Review the dispute reason, optionally update the scores, and enter resolution notes.
                The match returns to "Completed" status with the corrected result.
              </p>

              <h4>Forfeits</h4>
              <p>
                If a squad fails to check in or cannot play, the host can forfeit them from the match card dropdown.
                The opposing team gets a walkover win with full points (e.g., 2-0 in Bo3).
              </p>

              <h4>Squad Withdrawal</h4>
              <p>
                If a squad needs to withdraw entirely, the host can do so from Host Controls.
                All remaining matches for that squad are automatically forfeited, and opponents receive walkover wins.
              </p>
            </DocSection>

            {/* FAQ */}
            <DocSection id="faq" title="Frequently Asked Questions" icon={Search}>
              <FaqItem q="Can I be in multiple squads?">
                Yes, you can be a member of multiple squads. However, within a single tournament,
                the same MLBB ID cannot be registered in more than one squad.
              </FaqItem>
              <FaqItem q="How many roster changes are allowed?">
                Each squad can have up to 2 approved roster changes per tournament (or per stage in multi-stage tournaments). The host must approve each change.
              </FaqItem>
              <FaqItem q="What happens if my squad doesn't check in?">
                The host may forfeit your squad for that match. The opposing team gets a walkover win.
              </FaqItem>
              <FaqItem q="Can I edit a match result after it's entered?">
                Yes, the host can update scores through the score edit sheet on any match. If a dispute is raised, the host can also adjust scores during resolution.
              </FaqItem>
              <FaqItem q="Who can see the activity log?">
                The activity (audit) log is visible only to the tournament host and platform admins. It shows all significant events for accountability.
              </FaqItem>
              <FaqItem q="How are prizes managed?">
                Hosts define prize tiers during tournament creation (1st, 2nd, 3rd, MVP, etc.). After the tournament completes, the host can mark each tier as distributed.
              </FaqItem>
              <FaqItem q="Can a cancelled tournament be resumed?">
                No. Cancellation is permanent. If needed, create a new tournament.
              </FaqItem>
              <FaqItem q="What is a multi-stage tournament?">
                A multi-stage tournament has multiple phases — typically a group stage followed by a knockout bracket.
                Enable it when creating a tournament, then configure stages after closing registration.
              </FaqItem>
              <FaqItem q="What is pot-based seeded draw?">
                Pot-based draw assigns teams to tiers (pots) based on strength before the group draw.
                During the draw, each group receives exactly one team from each pot — ensuring balanced groups.
                This is the same system used in major international tournaments like the FIFA World Cup.
              </FaqItem>
              <FaqItem q="How does the coin toss work?">
                The host triggers a coin toss from the match card. An animated 3D coin flip determines the winner,
                who then picks their preferred side (Blue or Red). The result is cryptographically random.
              </FaqItem>
              <FaqItem q="What is seeded double elimination?">
                When advancing from a group stage, top teams enter the upper bracket and bottom-advancing teams enter the lower bracket directly.
                This rewards group stage performance by giving stronger teams the upper bracket advantage. It includes a semi-final round with 3rd-place designation.
              </FaqItem>
            </DocSection>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function DocSection({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <GlowCard id={id} className="p-6 sm:p-6 px-4 scroll-mt-20">
      <h2 className="text-lg sm:text-xl font-display font-bold text-foreground flex items-center gap-2 mb-4 tracking-wide">
        <Icon className="w-5 h-5 text-[#FF4500] shrink-0" />
        {title}
      </h2>
      <div className="prose-docs space-y-3 text-sm leading-relaxed text-muted-foreground [&_h4]:text-foreground [&_h4]:font-semibold [&_h4]:text-sm [&_h4]:mt-5 [&_h4]:mb-2 [&_strong]:text-foreground [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_li]:text-muted-foreground">
        {children}
      </div>
    </GlowCard>
  );
}

function StatusStep({ label, color }: { label: string; color: string }) {
  return (
    <span className={cn('font-medium whitespace-nowrap text-xs sm:text-sm', color)}>{label}</span>
  );
}

function FaqItem({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="p-3 bg-muted/30 rounded-lg">
      <p className="text-foreground font-medium text-sm mb-1">{q}</p>
      <p className="text-muted-foreground text-sm">{children}</p>
    </div>
  );
}
