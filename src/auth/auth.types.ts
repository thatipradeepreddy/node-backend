export type UserRecord = {
	id: number
	email: string
	password_hash: string
	name?: string | null
	role?: string
	verified?: number
	created_at?: number
}

export type User = {
	id: number
	email: string
	password_hash: string
	name?: string | null
	role?: string | null
	verified?: number | null
	verification_token?: string | null
	reset_token?: string | null
	reset_expiry?: number | null
	failed_logins?: number | null
	locked_until?: number | null
	created_at?: number | null
}
