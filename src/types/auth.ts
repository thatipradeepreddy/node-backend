export interface RegisterRequest {
	name: string
	email: string
	password: string
	phoneNumber?: string
	birthdate?: string
	gender?: string
	picture?: string
}

export interface ConfirmRequest {
	email: string
	code: string
}

export interface ResendRequest {
	email: string
}

export interface LoginRequest {
	email: string
	password: string
}

export interface CognitoAuthResult {
	AccessToken?: string
	IdToken?: string
	RefreshToken?: string
	ExpiresIn?: number
	TokenType?: string

	name?: string
	email?: string
	picture?: string
	phone_number?: string
	birthdate?: string
	gender?: string
}
