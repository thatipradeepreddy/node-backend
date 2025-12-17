export type QueryIntent = "GREETING" | "GENERAL" | "PLAYER_DB"

export function detectIntent(message: string): QueryIntent {
	const q = message.toLowerCase().trim()

	if (/^(hi|hello|hey|how are you|hai)\b/.test(q)) {
		return "GREETING"
	}

	const dbKeywords = [
		"player",
		"players",
		"stats",
		"performance",
		"best",
		"compare",
		"team",
		"my players",
		"batting",
		"bowling",
		"runs",
		"wickets",
		"average",
		"strike rate",
		"form"
	]

	if (dbKeywords.some(k => q.includes(k))) {
		return "PLAYER_DB"
	}

	return "GENERAL"
}
