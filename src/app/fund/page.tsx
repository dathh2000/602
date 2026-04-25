'use client'
import { useState } from 'react'
import { useRoom } from '@/src/hooks/useRoom'
import { useFund } from '@/src/hooks/useFund'
import { useAuth } from '@/src/hooks/useAuth'
import { FundBalance } from '@/src/components/fund/FundBalance'
import { ContributionList } from '@/src/components/fund/ContributionList'
import { TransactionHistory } from '@/src/components/fund/TransactionHistory'
import { FundSheet } from '@/src/components/fund/FundSheet'
import { LoadingScreen } from '@/src/components/ui/LoadingScreen'
import type { FundTxType } from '@/src/types'

export default function FundPage() {
  const { user } = useAuth()
  const { room, members, loading } = useRoom()
  const { fund, transactions } = useFund(room?.id)
  const [sheet, setSheet] = useState<FundTxType | null>(null)

  if (loading) return <LoadingScreen />

  return (
    <main className="p-4 space-y-4">
      <FundBalance
        balance={fund.balance}
        onDeposit={() => setSheet('deposit')}
        onWithdraw={() => setSheet('withdraw')}
      />
      <ContributionList members={members} transactions={transactions} />
      <TransactionHistory transactions={transactions} members={members} />
      {room && user && sheet && (
        <FundSheet
          open={true}
          onClose={() => setSheet(null)}
          roomId={room.id}
          currentUserId={user.uid}
          currentBalance={fund.balance}
          defaultType={sheet}
        />
      )}
    </main>
  )
}
