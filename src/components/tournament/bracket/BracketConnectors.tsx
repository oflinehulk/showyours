import { cn } from '@/lib/utils';

interface BracketConnectorsProps {
  /** Y-center positions of matches in the current round */
  currentPositions: number[];
  /** Y-center positions of matches in the next round */
  nextPositions: number[];
  /** Total bracket height */
  totalHeight: number;
  /** Width of the connector column */
  width?: number;
  /** Color variant */
  bracketType: 'winners' | 'losers';
}

export function BracketConnectors({
  currentPositions,
  nextPositions,
  totalHeight,
  width = 28,
  bracketType,
}: BracketConnectorsProps) {
  const lineColor = bracketType === 'winners' ? '#FF4500' : '#FF6B35';
  const opacity = 0.35;
  const strokeWidth = 2;
  const halfW = width / 2;

  // Determine connection pattern based on match count ratio
  const isMerge = nextPositions.length < currentPositions.length;

  if (isMerge) {
    // Merge pattern (2:1): pairs of current round feed into one next round match
    return (
      <div className="shrink-0 relative" style={{ width: `${width}px`, height: `${totalHeight}px` }}>
        <svg width={width} height={totalHeight} className="absolute inset-0">
          {nextPositions.map((nextY, i) => {
            const topY = currentPositions[i * 2];
            const bottomY = currentPositions[i * 2 + 1];
            if (topY === undefined) return null;

            // If only one feeder (odd match), draw straight line
            if (bottomY === undefined) {
              return (
                <line
                  key={i}
                  x1={0} y1={topY}
                  x2={width} y2={nextY}
                  stroke={lineColor}
                  strokeOpacity={opacity}
                  strokeWidth={strokeWidth}
                />
              );
            }

            // Classic bracket: horizontal stubs from each match, vertical bar, horizontal to next
            const midX = halfW;
            return (
              <g key={i}>
                {/* Top match horizontal stub */}
                <line x1={0} y1={topY} x2={midX} y2={topY}
                  stroke={lineColor} strokeOpacity={opacity} strokeWidth={strokeWidth} />
                {/* Bottom match horizontal stub */}
                <line x1={0} y1={bottomY} x2={midX} y2={bottomY}
                  stroke={lineColor} strokeOpacity={opacity} strokeWidth={strokeWidth} />
                {/* Vertical bar connecting top to bottom */}
                <line x1={midX} y1={topY} x2={midX} y2={bottomY}
                  stroke={lineColor} strokeOpacity={opacity} strokeWidth={strokeWidth} />
                {/* Horizontal line from midpoint to next round */}
                <line x1={midX} y1={nextY} x2={width} y2={nextY}
                  stroke={lineColor} strokeOpacity={opacity} strokeWidth={strokeWidth} />
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  // Passthrough pattern (1:1): each current match feeds into one next match
  return (
    <div className="shrink-0 relative" style={{ width: `${width}px`, height: `${totalHeight}px` }}>
      <svg width={width} height={totalHeight} className="absolute inset-0">
        {currentPositions.map((currY, i) => {
          const nextY = nextPositions[i];
          if (nextY === undefined) return null;

          if (Math.abs(currY - nextY) < 1) {
            // Straight horizontal line
            return (
              <line
                key={i}
                x1={0} y1={currY}
                x2={width} y2={nextY}
                stroke={lineColor}
                strokeOpacity={opacity}
                strokeWidth={strokeWidth}
              />
            );
          }

          // Angled: horizontal stub, vertical move, horizontal stub
          return (
            <g key={i}>
              <line x1={0} y1={currY} x2={halfW} y2={currY}
                stroke={lineColor} strokeOpacity={opacity} strokeWidth={strokeWidth} />
              <line x1={halfW} y1={currY} x2={halfW} y2={nextY}
                stroke={lineColor} strokeOpacity={opacity} strokeWidth={strokeWidth} />
              <line x1={halfW} y1={nextY} x2={width} y2={nextY}
                stroke={lineColor} strokeOpacity={opacity} strokeWidth={strokeWidth} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Layout computation: returns Y-center positions for each match in each round

export interface BracketLayout {
  roundPositions: number[][];
  totalHeight: number;
}

export function computeBracketLayout(
  matchCountsPerRound: number[],
  matchHeight: number,
  baseGap: number,
  headerHeight: number,
): BracketLayout {
  if (matchCountsPerRound.length === 0) {
    return { roundPositions: [], totalHeight: 0 };
  }

  const roundPositions: number[][] = [];

  // Round 1 (most matches): evenly spaced below header
  const r1Count = matchCountsPerRound[0];
  const r1Positions: number[] = [];
  for (let i = 0; i < r1Count; i++) {
    r1Positions.push(headerHeight + i * (matchHeight + baseGap) + matchHeight / 2);
  }
  roundPositions.push(r1Positions);

  // Subsequent rounds: derive positions from feeders
  for (let ri = 1; ri < matchCountsPerRound.length; ri++) {
    const prevPositions = roundPositions[ri - 1];
    const currCount = matchCountsPerRound[ri];
    const prevCount = prevPositions.length;
    const currPositions: number[] = [];

    if (currCount < prevCount) {
      // Merge (2:1): midpoint of each pair
      for (let i = 0; i < currCount; i++) {
        const topIdx = i * 2;
        const bottomIdx = i * 2 + 1;
        const top = prevPositions[topIdx];
        const bottom = bottomIdx < prevCount ? prevPositions[bottomIdx] : top;
        currPositions.push((top + bottom) / 2);
      }
    } else {
      // Passthrough (1:1): align directly
      for (let i = 0; i < currCount; i++) {
        if (i < prevCount) {
          currPositions.push(prevPositions[i]);
        } else {
          // Fallback: extend below
          const lastY = currPositions[currPositions.length - 1] || headerHeight + matchHeight / 2;
          currPositions.push(lastY + matchHeight + baseGap);
        }
      }
    }

    roundPositions.push(currPositions);
  }

  // Calculate total height from the maximum Y position
  let maxY = 0;
  for (const positions of roundPositions) {
    for (const y of positions) {
      if (y > maxY) maxY = y;
    }
  }

  const totalHeight = maxY + matchHeight / 2 + baseGap;

  return { roundPositions, totalHeight };
}
