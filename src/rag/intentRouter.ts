export type Intent = "GREETING" | "GENERAL_CRICKET" | "PLAYER_ANALYSIS"

const GREETINGS = ["hi", "hello", "hey", "hai"]

const PURE_CRICKET_THEORY_KEYWORDS = [
	"what is",
	"explain",
	"rules of",
	"types of",
	"how does",
	"difference between",
	"meaning of"
]

const PLAYER_CONTEXT_KEYWORDS = [
	"player",
	"players",
	"my players",
	"team",
	"stats",
	"performance",
	"best",
	"compare",
	"runs",
	"wickets",
	"average",
	"strike rate",
	"form",
	"bowling",
	"batting",
	"fielding",
	"spinner",
	"fast bowler",
	"batsman",
	"all rounder",
	"captain"
]

export function detectIntent(text: string): Intent {
	const q = text.toLowerCase().trim()

	if (GREETINGS.includes(q)) {
		return "GREETING"
	}

	if (PURE_CRICKET_THEORY_KEYWORDS.some(k => q.startsWith(k))) {
		return "GENERAL_CRICKET"
	}

	if (PLAYER_CONTEXT_KEYWORDS.some(k => q.includes(k))) {
		return "PLAYER_ANALYSIS"
	}

	return "PLAYER_ANALYSIS"
}
