// Barrel export for tournament hooks
export { tournamentKeys } from './queryKeys';

// Core tournament CRUD
export {
  useTournaments,
  useTournament,
  useMyTournaments,
  useCreateTournament,
  useUpdateTournament,
  useDeleteTournament,
} from './useTournamentCore';

// Tournament squads
export {
  useMyTournamentSquads,
  useCreateTournamentSquad,
  useUpdateTournamentSquad,
  useTournamentSquadMembers,
} from './useTournamentSquads';

// Tournament registrations
export {
  useTournamentRegistrations,
  useRegisterForTournament,
  useHostAddSquad,
  useUpdateRegistrationStatus,
  useWithdrawFromTournament,
  useDeleteRegistration,
} from './useTournamentRegistrations';

// Tournament matches
export {
  useTournamentMatches,
  useGlobalUpcomingMatches,
  useUpdateMatchResult,
  useUpdateMatchCheckIn,
  useForfeitMatch,
} from './useTournamentMatches';

// Bracket generation & reset
export {
  useGenerateBracket,
  useResetBracket,
  useResetStageBracket,
  useDeleteStages,
} from './useBracketGeneration';

// Bracket seeding
export {
  applyStandardSeeding,
  generateSeedOrder,
  useUpdateRegistrationSeed,
  useAutoSeedByRegistrationOrder,
} from './useBracketSeeding';

// Roster changes
export {
  useRosterChanges,
  useMakeRosterChange,
  useTournamentRosterChanges,
  useUpdateRosterChangeStatus,
  useHostEditRoster,
  useRecaptureRosterSnapshots,
} from './useTournamentRoster';

// Dispute resolution
export {
  useRaiseDispute,
  useResolveDispute,
} from './useDispute';

// Squad withdrawal
export { useWithdrawSquad } from './useWithdrawal';

// Team swap (group stage)
export { useSwapTeam } from './useTeamSwap';

// Multi-stage hooks
export {
  useTournamentStages,
  useTournamentGroups,
  useTournamentGroupTeams,
  useStageMatches,
  useCreateStages,
  useUpdateStage,
  useAssignTeamsToGroups,
  useGenerateStageBracket,
  useCompleteStage,
} from './useMultiStage';

// Coin toss & group draw
export {
  useSaveCoinToss,
  useResetCoinToss,
  useSaveGroupDraw,
} from './useCoinTossAndDraw';

// Re-export advancement helpers for direct use
export {
  advanceWinnerToNextRound,
  revertWinnerAdvancement,
  advanceLoserToLosersBracket,
  autoCompleteByes,
  findNextMatch,
  findGrandFinals,
  findSemiFinals,
  fetchStageK,
} from './matchAdvancementHelpers';
