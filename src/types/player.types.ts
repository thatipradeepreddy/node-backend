export type PlayerRole = "BATSMAN" | "BOWLER" | "ALL_ROUNDER" | "WICKET_KEEPER"

export type BattingStyle = "RIGHT_HAND" | "LEFT_HAND" | "NONE"
export type BowlingStyle =
	| "RIGHT_ARM_FAST"
	| "RIGHT_ARM_MEDIUM"
	| "RIGHT_ARM_OFF_SPIN"
	| "RIGHT_ARM_LEG_SPIN"
	| "LEFT_ARM_FAST"
	| "LEFT_ARM_MEDIUM"
	| "LEFT_ARM_ORTHODOX"
	| "LEFT_ARM_WRIST_SPIN"
	| "NONE"

export type MatchFormat = "TEST" | "ODI" | "T20I" | "IPL" | "DOMESTIC" | "UNDER_19"

export interface BattingStats {
	matches: number
	innings: number
	runs: number
	ballsFaced: number
	average: number
	strikeRate: number
	highestScore: number
	hundreds: number
	doubleHundreds?: number
	fifties: number
	fours: number
	sixes: number
	notOuts: number
}

export interface Player {
	id: string
	ownerId: string
	name: string
	age?: number
	village: string
	role: PlayerRole
	battingStyle: BattingStyle
	bowlingStyle: BowlingStyle
	statsByFormat: StatsByFormat
	leadership?: LeadershipStats
	milestones?: CareerMilestones
	teams?: string[]
	isActive: boolean
	imageKey?: string
	createdAt: string
	updatedAt: string
}

export interface BowlingStats {
	matches: number
	innings: number
	overs: number
	maidens: number
	runsConceded: number
	wickets: number
	average: number
	economy: number
	strikeRate: number
	fiveWicketHauls: number
	tenWicketHauls?: number
	hatTricks: number
	bestFigures: string
}

export interface FieldingStats {
	catches: number
	stumpings?: number
	runOuts: number
}

export interface LeadershipStats {
	isCaptain: boolean
	matchesAsCaptain: number
	wins: number
	losses: number
	draws?: number
}

export interface CreatePlayerInput {
	name: string
	age?: number
	village: string
	role: PlayerRole
	battingStyle?: BattingStyle
	bowlingStyle?: BowlingStyle
	matches?: number
	runs?: number
	wickets?: number
	strikeRate?: number
	economyRate?: number
	average?: number
	teams?: string[]
	isActive?: boolean
}

export interface CareerMilestones {
	debutYear: number
	retirementYear?: number
	playerOfMatchAwards: number
	playerOfSeriesAwards: number
	worldCupsWon?: number
}

export interface UpdatePlayerInput {
	name?: string
	age?: number
	village?: string
	role?: PlayerRole
	battingStyle?: BattingStyle
	bowlingStyle?: BowlingStyle
	matches?: number
	runs?: number
	wickets?: number
	strikeRate?: number
	economyRate?: number
	average?: number
	teams?: string[]
	isActive?: boolean
	statsByFormat?: StatsByFormat
}

export interface FormatStats {
	batting?: BattingStats
	bowling?: BowlingStats
	fielding?: FieldingStats
}

export type StatsByFormat = {
	[key in MatchFormat]?: FormatStats
}

export interface PlayerInsights {
	formIndex: number
	consistencyScore: number
	captainSuitability: number
	strengths: string[]
	weaknesses: string[]
	recommendedRole: string
}
