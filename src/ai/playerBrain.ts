import { Player } from "../types/player.types"

export function analyzePlayer(player: Player) {
	let totalRuns = 0
	let totalWickets = 0
	let avgSum = 0
	let avgCount = 0

	for (const f of Object.values(player.statsByFormat || {})) {
		if (f.batting) {
			totalRuns += f.batting.runs
			if (f.batting.average) {
				avgSum += f.batting.average
				avgCount++
			}
		}
		if (f.bowling) {
			totalWickets += f.bowling.wickets
		}
	}

	const avgRuns = avgCount ? avgSum / avgCount : 0

	return {
		totalRuns,
		totalWickets,
		avgRuns,
		battingImpact: avgRuns * 10,
		bowlingImpact: totalWickets * 20
	}
}
