import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { GroupStanding } from '@/lib/tournament-types';

interface GroupStandingsProps {
  standings: GroupStanding[];
  groupLabel: string;
  advanceCount?: number; // Number of teams that advance to UB (highlighted green)
  advanceToLowerCount?: number; // Number of teams that advance to LB (highlighted orange)
}

export function GroupStandings({ standings, groupLabel, advanceCount = 0, advanceToLowerCount = 0 }: GroupStandingsProps) {
  return (
    <div className="rounded-lg border border-border/50 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/50">
        <div className="w-5 h-5 rounded bg-[#FF4500]/10 border border-[#FF4500]/30 flex items-center justify-center text-[10px] font-bold text-[#FF4500]">
          {groupLabel}
        </div>
        <span className="text-xs font-semibold text-foreground">Group {groupLabel}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-b border-border/30">
              <th className="text-left px-3 py-1.5 font-medium">#</th>
              <th className="text-left px-3 py-1.5 font-medium">Team</th>
              <th className="text-center px-2 py-1.5 font-medium">P</th>
              <th className="text-center px-2 py-1.5 font-medium">W</th>
              <th className="text-center px-2 py-1.5 font-medium">L</th>
              <th className="text-center px-2 py-1.5 font-medium hidden sm:table-cell">+/-</th>
              <th className="text-center px-2 py-1.5 font-medium">
                <span className="hidden sm:inline">Pts</span>
                <span className="sm:hidden">Pts/+</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, i) => {
              const isAdvancing = advanceCount > 0 && i < advanceCount;
              const isLowerBracket = !isAdvancing && advanceToLowerCount > 0 && i < advanceCount + advanceToLowerCount;
              return (
                <tr
                  key={s.squad_id}
                  className={cn(
                    'border-b border-border/20 last:border-0 transition-colors',
                    isAdvancing && 'bg-green-500/5',
                    isLowerBracket && 'bg-orange-500/5',
                  )}
                >
                  <td className="px-3 py-2">
                    <span className={cn(
                      'inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold',
                      isAdvancing
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : isLowerBracket
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'text-muted-foreground'
                    )}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="h-5 w-5 shrink-0">
                        {s.squad.logo_url ? (
                          <AvatarImage src={s.squad.logo_url} alt={s.squad.name} />
                        ) : null}
                        <AvatarFallback className="text-[9px] bg-[#1a1a1a] text-muted-foreground">
                          {s.squad.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        'font-medium truncate',
                        isAdvancing ? 'text-green-400' : isLowerBracket ? 'text-orange-400' : 'text-foreground'
                      )}>
                        {s.squad.name}
                      </span>
                    </div>
                  </td>
                  <td className="text-center px-2 py-2 text-muted-foreground">{s.played}</td>
                  <td className="text-center px-2 py-2 text-foreground font-medium">{s.wins}</td>
                  <td className="text-center px-2 py-2 text-muted-foreground">{s.losses}</td>
                  <td className="text-center px-2 py-2 hidden sm:table-cell">
                    <span className={cn(
                      s.score_for - s.score_against > 0 && 'text-green-400',
                      s.score_for - s.score_against < 0 && 'text-red-400',
                      s.score_for - s.score_against === 0 && 'text-muted-foreground',
                    )}>
                      {s.score_for - s.score_against > 0 ? '+' : ''}{s.score_for - s.score_against}
                    </span>
                  </td>
                  <td className="text-center px-2 py-2">
                    <div className="flex flex-col items-center">
                      <span className={cn(
                        'font-bold',
                        isAdvancing ? 'text-green-400' : isLowerBracket ? 'text-orange-400' : 'text-[#FF4500]'
                      )}>
                        {s.points}
                      </span>
                      <span className={cn(
                        'text-[10px] sm:hidden',
                        s.score_for - s.score_against > 0 && 'text-green-400',
                        s.score_for - s.score_against < 0 && 'text-red-400',
                        s.score_for - s.score_against === 0 && 'text-muted-foreground',
                      )}>
                        {s.score_for - s.score_against > 0 ? '+' : ''}{s.score_for - s.score_against}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
