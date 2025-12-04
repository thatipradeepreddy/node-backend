import {
	CognitoIdentityProviderClient,
	ListUsersCommand,
	AdminUpdateUserAttributesCommand
} from "@aws-sdk/client-cognito-identity-provider"

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION })
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID!

function extractKeyFromUrl(urlStr: string) {
	try {
		const url = new URL(urlStr)
		return url.pathname.replace(/^\//, "")
	} catch {
		return ""
	}
}

async function migrate() {
	let PaginationToken: string | undefined = undefined
	do {
		const res: any = await client.send(
			new ListUsersCommand({
				UserPoolId: USER_POOL_ID,
				Limit: 60,
				PaginationToken
			})
		)
		for (const user of res.Users || []) {
			const attrs = Object.fromEntries((user.Attributes || []).map((a: any) => [a.Name, a.Value]))
			const pic = attrs.picture
			if (pic && (pic.startsWith("http://") || pic.startsWith("https://"))) {
				const key = extractKeyFromUrl(pic)
				if (key) {
					console.log("Updating user", user.Username, "->", key)
					await client.send(
						new AdminUpdateUserAttributesCommand({
							UserPoolId: USER_POOL_ID,
							Username: user.Username,
							UserAttributes: [{ Name: "picture", Value: key }]
						})
					)
				}
			}
		}
		PaginationToken = res.PaginationToken
	} while (PaginationToken)
	console.log("done")
}

migrate().catch(err => {
	console.error(err)
	process.exit(1)
})
