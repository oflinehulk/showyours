// Centralized query keys for tournament-related queries
export const tournamentKeys = {
  all: ['tournaments'] as const,
  detail: (id: string | undefined) => ['tournament', id] as const,
  my: (userId: string | undefined) => ['my-tournaments', userId] as const,
  registrations: (tournamentId: string | undefined) => ['tournament-registrations', tournamentId] as const,
  matches: (tournamentId: string | undefined) => ['tournament-matches', tournamentId] as const,
  stageMatches: (stageId: string | undefined) => ['stage-matches', stageId] as const,
  stages: (tournamentId: string | undefined) => ['tournament-stages', tournamentId] as const,
  groups: (stageId: string | undefined) => ['tournament-groups', stageId] as const,
  groupTeams: (stageId: string | undefined) => ['tournament-group-teams', stageId] as const,
  squadMembers: (squadId: string | undefined) => ['tournament-squad-members', squadId] as const,
  mySquads: (userId: string | undefined) => ['my-tournament-squads', userId] as const,
  rosterChanges: (squadId: string | undefined, tournamentId: string | undefined) => ['roster-changes', squadId, tournamentId] as const,
  tournamentRosterChanges: (tournamentId: string | undefined) => ['tournament-roster-changes', tournamentId] as const,
  globalUpcoming: (limit: number) => ['global-upcoming-matches', limit] as const,
  allSquadsForHostAdd: ['all-squads-for-host-add'] as const,
};
