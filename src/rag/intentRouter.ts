export type Intent = "GREETING" | "GENERAL_CRICKET" | "PLAYER_ANALYSIS" | "UNKNOWN"

const GREETINGS = ["hi", "hello", "hey", "hai"]

const PURE_CRICKET_KEYWORDS = ["what is", "rules", "explain", "types of", "how does", "meaning of"]

const PLAYER_KEYWORDS = [
	"player",
	"players",
	"stats",
	"compare",
	"best",
	"runs",
	"wickets",
	"average",
	"strike rate",
	"batting",
	"bowling",
	"form"
]

export function detectIntent(text: string): Intent {
	const q = text.toLowerCase().trim()

	if (GREETINGS.some(g => q.startsWith(g))) return "GREETING"
	if (PLAYER_KEYWORDS.some(k => q.includes(k))) return "PLAYER_ANALYSIS"
	if (PURE_CRICKET_KEYWORDS.some(k => q.includes(k))) return "GENERAL_CRICKET"

	return "UNKNOWN"
}
