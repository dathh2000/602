export async function sendZaloMessage(zaloUserId: string, message: string): Promise<void> {
  const res = await fetch('https://openapi.zalo.me/v2.0/oa/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      access_token: process.env.ZALO_OA_ACCESS_TOKEN!,
    },
    body: JSON.stringify({
      recipient: { user_id: zaloUserId },
      message: { text: message },
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error(`Zalo notify failed for ${zaloUserId}:`, err)
  }
}

export async function notifyBillDue(memberZaloIds: string[], billTitle: string, daysLeft: number, amount: number): Promise<void> {
  const msg = `⏰ Nhắc nhở: ${billTitle} đến hạn trong ${daysLeft} ngày nữa!\n💰 Số tiền: ${new Intl.NumberFormat('vi-VN').format(amount)}₫\nHãy chuẩn bị đóng tiền nhé 🏠`
  await Promise.allSettled(memberZaloIds.map(id => sendZaloMessage(id, msg)))
}

export async function notifyNewExpense(participantZaloIds: string[], title: string, amount: number, paidByName: string, share: number): Promise<void> {
  const msg = `💸 Chi tiêu mới: ${title}\n${paidByName} vừa chi ${new Intl.NumberFormat('vi-VN').format(amount)}₫\nPhần của bạn: ${new Intl.NumberFormat('vi-VN').format(share)}₫`
  await Promise.allSettled(participantZaloIds.map(id => sendZaloMessage(id, msg)))
}
