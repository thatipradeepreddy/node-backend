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

export interface Player {
	id: string
	name: string
	age?: number
	village: string
	role: PlayerRole
	battingStyle: BattingStyle
	bowlingStyle: BowlingStyle
	matches?: number
	runs?: number
	wickets?: number
	strikeRate?: number
	economyRate?: number
	average?: number
	teams?: string[]
	isActive: boolean
	imageKey?: string
	createdAt: string
	updatedAt: string
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
}
