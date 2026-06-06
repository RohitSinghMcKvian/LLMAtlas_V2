"use client"

import { useEffect, useState } from "react"
import { Loader2, CheckCircle2, XCircle, Monitor, Smartphone, Globe } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface LoginRecord {
  id: string
  ipAddress: string | null
  device: string | null
  browser: string | null
  os: string | null
  success: boolean
  failReason: string | null
  createdAt: string
}

export function LoginHistoryTable() {
  const [history, setHistory] = useState<LoginRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetch("/api/user/login-history")
      .then((r) => r.json())
      .then((data) => { setHistory(data); setIsLoading(false) })
      .catch(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!history.length) {
    return <p className="text-sm text-muted-foreground py-4">No login history yet.</p>
  }

  return (
    <div className="space-y-2">
      {history.map((record) => (
        <div
          key={record.id}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-white/5"
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${record.success ? "bg-green-400" : "bg-red-400"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">
                {record.browser || "Unknown browser"}
              </span>
              {record.os && <span className="text-xs text-muted-foreground">on {record.os}</span>}
              {record.device && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Monitor className="w-3 h-3" /> {record.device}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              {record.ipAddress && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {record.ipAddress}</span>}
              <span>{formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            {record.success ? (
              <CheckCircle2 className="w-4 h-4 text-green-400" />
            ) : (
              <div className="text-right">
                <XCircle className="w-4 h-4 text-red-400 ml-auto" />
                {record.failReason && <p className="text-xs text-red-400 mt-0.5">{record.failReason}</p>}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
