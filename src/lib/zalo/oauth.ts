export function buildZaloAuthUrl(state: string): string {
  const params = new URLSearchParams({
    app_id: process.env.ZALO_APP_ID!,
    redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/zalo/callback`,
    state,
  })
  return `https://oauth.zaloapp.com/v4/permission?${params}`
}

export async function exchangeZaloCode(code: string): Promise<{ access_token: string; id: string; name: string; picture: { data: { url: string } } }> {
  const res = await fetch('https://oauth.zaloapp.com/v4/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', secret_key: process.env.ZALO_APP_SECRET! },
    body: new URLSearchParams({ code, app_id: process.env.ZALO_APP_ID!, grant_type: 'authorization_code' }),
  })
  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Zalo token exchange failed: ${res.status} ${errBody}`)
  }
  const token = await res.json()
  if (token.error) throw new Error(`Zalo token error: ${JSON.stringify(token)}`)

  const userRes = await fetch(`https://graph.zalo.me/v2.0/me?fields=id,name,picture`, {
    headers: { access_token: token.access_token },
  })
  if (!userRes.ok) throw new Error(`Zalo user info fetch failed: ${userRes.status}`)
  const zaloUser = await userRes.json()
  if (!zaloUser.id) throw new Error(`Zalo user info missing id: ${JSON.stringify(zaloUser)}`)
  return zaloUser
}
