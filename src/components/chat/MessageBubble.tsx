'use client'
import { format, isToday, isYesterday } from 'date-fns'
import { vi } from 'date-fns/locale'
import type { Message, Member } from '@/src/types'

interface Props {
  message: Message
  sender: Member | undefined
  isMine: boolean
  showSenderName: boolean
  onImageClick?: (url: string) => void
  // Members who have seen this message. Only renders when isMine.
  // Caller decides which message gets a reader's avatar (typically the
  // newest message that reader has read — Messenger-style "last seen").
  readers?: Member[]
}

export function MessageBubble({ message, sender, isMine, showSenderName, onImageClick, readers }: Props) {
  const time = format(message.createdAt, 'HH:mm')
  const showReaders = isMine && readers && readers.length > 0

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} gap-2`}>
      {!isMine && (
        <div className="w-8 h-8 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 font-bold text-xs shrink-0 self-end mb-5">
          {sender?.avatarUrl
            ? <img src={sender.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
            : sender?.displayName?.charAt(0).toUpperCase() ?? '?'}
        </div>
      )}
      <div className={`max-w-[75%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
        {showSenderName && !isMine && (
          <p className="text-[10px] text-amber-700 mb-0.5 ml-1">{sender?.displayName ?? 'Ẩn danh'}</p>
        )}
        {message.imageUrls && message.imageUrls.length > 0 && (
          <div className={`grid gap-1 mb-1 ${message.imageUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {message.imageUrls.map((url, i) => (
              <img key={url + i} src={url} alt={`image ${i}`}
                onClick={() => onImageClick?.(url)}
                className="rounded-xl max-w-[200px] max-h-[200px] object-cover cursor-pointer active:opacity-75" />
            ))}
          </div>
        )}
        {message.text && (
          <div className={`rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${
            isMine
              ? 'bg-gradient-to-br from-amber-400 to-red-500 text-white rounded-br-md'
              : 'bg-white text-gray-800 border border-amber-100 rounded-bl-md'
          }`}>
            {message.text}
          </div>
        )}
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMine ? 'flex-row-reverse' : ''}`}>
          <p className="text-[10px] text-gray-400">{time}</p>
          {isMine && (
            message.isPending
              ? <span title="Đang gửi" className="w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin shrink-0" />
              : <span title="Đã gửi" className="text-gray-400 text-[10px] leading-none">✓</span>
          )}
        </div>
        {showReaders && (
          <div className="flex items-center gap-1 mt-0.5 px-1">
            <span className="text-[9px] text-amber-700">Đã xem</span>
            <div className="flex -space-x-1">
              {readers!.slice(0, 3).map(r => (
                <div key={r.id} title={r.displayName}
                  className="w-4 h-4 rounded-full bg-amber-200 border border-white flex items-center justify-center text-[8px] font-bold text-amber-800 overflow-hidden">
                  {r.avatarUrl
                    ? <img src={r.avatarUrl} alt="" className="w-full h-full object-cover" />
                    : r.displayName?.charAt(0).toUpperCase() ?? '?'}
                </div>
              ))}
            </div>
            {readers!.length > 3 && (
              <span className="text-[9px] text-gray-400">+{readers!.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function DateDivider({ date }: { date: Date }) {
  let label: string
  if (isToday(date)) label = 'Hôm nay'
  else if (isYesterday(date)) label = 'Hôm qua'
  else label = format(date, 'EEEE, dd/MM/yyyy', { locale: vi })

  return (
    <div className="flex items-center gap-2 my-2">
      <div className="flex-1 h-px bg-amber-200" />
      <span className="text-[10px] text-amber-700 font-semibold uppercase tracking-wide">{label}</span>
      <div className="flex-1 h-px bg-amber-200" />
    </div>
  )
}
