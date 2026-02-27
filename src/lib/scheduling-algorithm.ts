/**
 * Auto-scheduling algorithm for tournament matches.
 * Greedy, earliest-valid-slot approach.
 */

export interface AvailabilitySlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
}

export interface MatchToSchedule {
  id: string;
  round: number;
  match_number: number;
  squad_a_id: string | null;
  squad_b_id: string | null;
  scheduled_time: string | null;
}

export interface ScheduleResult {
  scheduled: { matchId: string; scheduledTime: string }[];
  unschedulable: { matchId: string; reason: string }[];
}

/**
 * Converts a date+time slot to an ISO datetime string (IST = UTC+5:30).
 */
function slotToISO(date: string, time: string): string {
  return `${date}T${time}:00+05:30`;
}

/**
 * Converts a date+time slot to a comparable key.
 */
function slotKey(date: string, time: string): string {
  return `${date}|${time}`;
}

/**
 * Get adjacent slot keys that should be blocked given a gap in minutes.
 * The 6 standard slots are: 21:00, 21:30, 22:00, 22:30, 23:00, 23:30
 */
function getBlockedSlots(date: string, time: string, gapMinutes: number): string[] {
  const SLOTS = ['21:00', '21:30', '22:00', '22:30', '23:00', '23:30'];
  const blocked: string[] = [slotKey(date, time)];

  const baseIndex = SLOTS.indexOf(time);
  if (baseIndex === -1) return blocked;

  // Block subsequent slots within the gap
  const slotsToBlock = Math.ceil(gapMinutes / 30);
  for (let i = 1; i < slotsToBlock; i++) {
    const nextIndex = baseIndex + i;
    if (nextIndex < SLOTS.length) {
      blocked.push(slotKey(date, SLOTS[nextIndex]));
    }
  }

  // Also block preceding slots that would overlap into this one
  for (let i = 1; i < slotsToBlock; i++) {
    const prevIndex = baseIndex - i;
    if (prevIndex >= 0) {
      blocked.push(slotKey(date, SLOTS[prevIndex]));
    }
  }

  return blocked;
}

/**
 * Run the auto-scheduling algorithm.
 *
 * @param matches - All pending matches (both squads assigned)
 * @param availability - Map of squadId -> array of available slots
 * @param gapMinutes - Minimum gap between matches for the same team (default 60)
 */
export function autoScheduleMatches(
  matches: MatchToSchedule[],
  availability: Map<string, AvailabilitySlot[]>,
  gapMinutes: number = 60
): ScheduleResult {
  const result: ScheduleResult = { scheduled: [], unschedulable: [] };

  // Parse availability into sets for fast lookup
  const availSets = new Map<string, Set<string>>();
  for (const [squadId, slots] of availability) {
    availSets.set(squadId, new Set(slots.map(s => slotKey(s.date, s.time))));
  }

  // Track occupied slots per squad
  const occupiedSlots = new Map<string, Set<string>>();

  // Seed occupied slots from already-scheduled matches (manual or previous auto-schedule)
  for (const m of matches) {
    if (!m.scheduled_time || !m.squad_a_id || !m.squad_b_id) continue;
    const dt = new Date(m.scheduled_time);
    const date = dt.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const hours = dt.getHours().toString().padStart(2, '0');
    const mins = dt.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${mins}`;
    const blocked = getBlockedSlots(date, time, gapMinutes);
    for (const squadId of [m.squad_a_id, m.squad_b_id]) {
      if (!occupiedSlots.has(squadId)) occupiedSlots.set(squadId, new Set());
      for (const b of blocked) {
        occupiedSlots.get(squadId)!.add(b);
      }
    }
  }

  // Sort unscheduled matches: round ASC, match_number ASC
  const sortedMatches = [...matches]
    .filter(m => m.squad_a_id && m.squad_b_id && !m.scheduled_time)
    .sort((a, b) => a.round - b.round || a.match_number - b.match_number);

  // Collect all possible slot keys sorted chronologically
  const allSlotKeys = new Set<string>();
  for (const slots of availability.values()) {
    for (const s of slots) {
      allSlotKeys.add(slotKey(s.date, s.time));
    }
  }
  const sortedSlotKeys = [...allSlotKeys].sort();

  for (const match of sortedMatches) {
    const squadAId = match.squad_a_id!;
    const squadBId = match.squad_b_id!;

    const squadAAvail = availSets.get(squadAId);
    const squadBAvail = availSets.get(squadBId);

    if (!squadAAvail || squadAAvail.size === 0) {
      result.unschedulable.push({ matchId: match.id, reason: 'Team A has not submitted availability' });
      continue;
    }
    if (!squadBAvail || squadBAvail.size === 0) {
      result.unschedulable.push({ matchId: match.id, reason: 'Team B has not submitted availability' });
      continue;
    }

    const squadAOccupied = occupiedSlots.get(squadAId) || new Set<string>();
    const squadBOccupied = occupiedSlots.get(squadBId) || new Set<string>();

    let assigned = false;

    for (const sk of sortedSlotKeys) {
      // Both teams must be available at this slot
      if (!squadAAvail.has(sk) || !squadBAvail.has(sk)) continue;

      // Neither team can be occupied at this slot (or adjacent)
      if (squadAOccupied.has(sk) || squadBOccupied.has(sk)) continue;

      // Assign this slot
      const [date, time] = sk.split('|');
      const scheduledTime = slotToISO(date, time);

      result.scheduled.push({ matchId: match.id, scheduledTime });

      // Block adjacent slots for both teams
      const blocked = getBlockedSlots(date, time, gapMinutes);
      if (!occupiedSlots.has(squadAId)) occupiedSlots.set(squadAId, new Set());
      if (!occupiedSlots.has(squadBId)) occupiedSlots.set(squadBId, new Set());
      for (const b of blocked) {
        occupiedSlots.get(squadAId)!.add(b);
        occupiedSlots.get(squadBId)!.add(b);
      }

      assigned = true;
      break;
    }

    if (!assigned) {
      result.unschedulable.push({ matchId: match.id, reason: 'No overlapping available slots' });
    }
  }

  return result;
}
