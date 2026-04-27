import { formatRelativeTime } from '@/src/lib/utils'
import type { Activity, ActivityType, Member } from '@/src/types'

const TYPE_META: Record<ActivityType, { icon: string; bg: string; ring: string }> = {
  'expense.created':  { icon: '💸', bg: 'bg-amber-100',  ring: 'ring-amber-200'  },
  'expense.settled':  { icon: '✓',  bg: 'bg-green-100',  ring: 'ring-green-200'  },
  'debt.settled':     { icon: '🤝', bg: 'bg-green-100',  ring: 'ring-green-200'  },
  'bill.created':     { icon: '📅', bg: 'bg-blue-100',   ring: 'ring-blue-200'   },
  'bill.due':         { icon: '⏰', bg: 'bg-red-100',    ring: 'ring-red-200'    },
  'bill.paid':        { icon: '✅', bg: 'bg-green-100',  ring: 'ring-green-200'  },
  'fund.deposit':     { icon: '💵', bg: 'bg-emerald-100', ring: 'ring-emerald-200' },
  'fund.withdraw':    { icon: '💴', bg: 'bg-orange-100', ring: 'ring-orange-200' },
  'announcement':     { icon: '📢', bg: 'bg-purple-100', ring: 'ring-purple-200' },
}

interface Props {
  activity: Activity
  members: Member[]
  isUnread: boolean
}

export function ActivityItem({ activity, members, isUnread }: Props) {
  const meta = TYPE_META[activity.type]
  const actor = activity.actorId ? members.find(m => m.id === activity.actorId) : null

  return (
    <div className={`flex gap-3 p-3 rounded-xl ${isUnread ? 'bg-amber-50 ring-2 ring-amber-200' : 'bg-white'}`}>
      <div className={`shrink-0 w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center text-base ring-2 ${meta.ring}`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800 leading-tight">{activity.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-tight">{activity.body}</p>
        <p className="text-[10px] text-gray-400 mt-1">
          {actor?.displayName ?? 'Hệ thống'} · {formatRelativeTime(activity.createdAt)}
        </p>
      </div>
      {isUnread && <div className="shrink-0 w-2 h-2 bg-red-500 rounded-full mt-2" />}
    </div>
  )
}
