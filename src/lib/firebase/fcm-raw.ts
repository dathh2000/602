// Raw FCM v1 sender: bypasses firebase-admin/messaging due to URL-building bug.
// Uses service account private key → JWT → OAuth2 access token → FCM v1 POST.

import crypto from 'node:crypto'

interface FcmMessage {
  token: string
  data: Record<string, string>
}

interface SendResult {
  success: boolean
  errorCode?: string
  errorMessage?: string
}

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey  = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!clientEmail || !privateKey) {
    throw new Error('Missing FIREBASE_ADMIN_CLIENT_EMAIL or FIREBASE_ADMIN_PRIVATE_KEY')
  }

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const claim = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }

  const b64url = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${b64url(header)}.${b64url(claim)}`
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(privateKey)
    .toString('base64url')
  const jwt = `${signingInput}.${signature}`

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!tokenRes.ok) {
    const txt = await tokenRes.text()
    throw new Error(`OAuth2 token exchange failed: ${tokenRes.status} ${txt}`)
  }
  const tokenJson = await tokenRes.json() as { access_token: string; expires_in: number }
  cachedToken = {
    value: tokenJson.access_token,
    expiresAt: Date.now() + tokenJson.expires_in * 1000,
  }
  return cachedToken.value
}

async function sendOne(projectId: string, accessToken: string, msg: FcmMessage): Promise<SendResult> {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: msg }),
    },
  )
  if (res.ok) return { success: true }
  const errJson = await res.json().catch(() => null) as { error?: { message?: string; status?: string; details?: { errorCode?: string }[] } } | null
  const errorCode = errJson?.error?.details?.[0]?.errorCode ?? errJson?.error?.status
  const errorMessage = errJson?.error?.message ?? `HTTP ${res.status}`
  return { success: false, errorCode, errorMessage }
}

export async function sendPushMulticast(
  projectId: string,
  tokens: string[],
  notification: { title: string; body: string },
  data?: Record<string, string>,
): Promise<{ successCount: number; failureCount: number; results: { token: string; result: SendResult }[] }> {
  const accessToken = await getAccessToken()
  // Data-only payload: avoids FCM SDK auto-displaying a notification in addition
  // to the one our service worker shows from onBackgroundMessage (would duplicate).
  const mergedData: Record<string, string> = {
    ...(data ?? {}),
    title: notification.title,
    body: notification.body,
  }
  const results = await Promise.all(
    tokens.map(async token => ({
      token,
      result: await sendOne(projectId, accessToken, {
        token,
        data: mergedData,
      }),
    })),
  )
  return {
    successCount: results.filter(r => r.result.success).length,
    failureCount: results.filter(r => !r.result.success).length,
    results,
  }
}
