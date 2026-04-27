'use client'
import { useEffect, useState } from 'react'
import { getDocs, writeBatch } from 'firebase/firestore'
import { db } from '@/src/lib/firebase/config'
import { expensesCol } from '@/src/lib/firebase/collections'
import { computeAllSettled } from '@/src/lib/expense'
import type { Settlement } from '@/src/types'

/**
 * One-time backfill: thêm field `allSettled` cho các expense doc cũ chưa có.
 * Chạy 1 lần per session per room (sessionStorage flag).
 *
 * Sau khi xong, query `where allSettled = false` mới hoạt động đúng.
 */
export function useExpensesMigration(roomId: string | undefined) {
  const [migrated, setMigrated] = useState(false)

  useEffect(() => {
    if (!roomId) return
    if (typeof window === 'undefined') return

    const flagKey = `migrated-allSettled-${roomId}`
    if (sessionStorage.getItem(flagKey)) {
      setMigrated(true)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const snap = await getDocs(expensesCol(roomId))
        const docsToMigrate = snap.docs.filter(d => d.data().allSettled === undefined)

        if (docsToMigrate.length > 0) {
          // Firestore batch limit 500
          for (let i = 0; i < docsToMigrate.length; i += 500) {
            const batch = writeBatch(db)
            for (const d of docsToMigrate.slice(i, i + 500)) {
              const data = d.data()
              const allSettled = data.paidFromFund
                ? true
                : computeAllSettled(
                    data.participants ?? [],
                    (data.settlements ?? {}) as Record<string, Settlement>,
                  )
              batch.update(d.ref, { allSettled })
            }
            await batch.commit()
            if (cancelled) return
          }
        }
        sessionStorage.setItem(flagKey, '1')
        if (!cancelled) setMigrated(true)
      } catch (err) {
        console.warn('[migration] expenses allSettled failed:', err)
      }
    })()

    return () => { cancelled = true }
  }, [roomId])

  return migrated
}
