import { Player } from "../types/player.types"

export function analyzePlayer(player: Player) {
	const formats = Object.values(player.statsByFormat || {})

	let totalRuns = 0
	let totalMatches = 0
	let totalWickets = 0

	for (const f of formats) {
		if (f.batting) {
			totalRuns += f.batting.runs
			totalMatches += f.batting.matches
		}
		if (f.bowling) {
			totalWickets += f.bowling.wickets
		}
	}

	const avgRuns = totalMatches ? totalRuns / totalMatches : 0

	return {
		totalRuns,
		totalMatches,
		totalWickets,
		avgRuns,
		roleHint:
			avgRuns > 40 && totalWickets > 80
				? "ALL_ROUNDER"
				: avgRuns > 40
					? "BATSMAN"
					: totalWickets > 100
						? "BOWLER"
						: "UTILITY"
	}
}
