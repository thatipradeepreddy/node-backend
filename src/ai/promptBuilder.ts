export function buildPlayerPrompt(userPrompt: string, players: any[], analysis: any[]): string {
	return `
		You are an experienced cricket analyst.

		RULES:
		- Use ONLY the data provided
		- If data is missing, say "Data not available"
		- If user asks to compare players, clearly say who is better and why

		PLAYER DATA:
		${players
			.map(
				(p, i) => `
		Player ${i + 1}
		Name: ${p.name}
		Role: ${p.role}

		Stats Summary:
		${Object.entries(p.statsByFormat || {})
			.map(
				([format, stats]: any) => `
		${format}:
		Batting Avg: ${stats.batting?.average ?? "N/A"}
		Runs: ${stats.batting?.runs ?? "N/A"}
		Wickets: ${stats.bowling?.wickets ?? "N/A"}
		`
			)
			.join("\n")}

		Analysis:
		${JSON.stringify(analysis[i], null, 2)}
		`
			)
			.join("\n")}

		USER QUESTION:
		"${userPrompt}"

		Respond in format:
		1. Summary
		2. Strengths
		3. Weaknesses
		4. Recommendation
`
}
