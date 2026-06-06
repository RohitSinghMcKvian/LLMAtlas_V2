"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasPassword: boolean
}

export function DeleteAccountDialog({ open, onOpenChange, hasPassword }: DeleteAccountDialogProps) {
  const router = useRouter()
  const [confirmation, setConfirmation] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (confirmation !== "DELETE") {
      toast.error("Please type DELETE to confirm")
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/user/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password || undefined, confirmation }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Deletion failed")
        return
      }
      await signOut({ redirect: false })
      router.push("/?deleted=1")
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-red-400" />
            </div>
            <DialogTitle>Delete your account</DialogTitle>
          </div>
          <DialogDescription>
            This action is <strong>permanent and irreversible</strong>. All your data — prompts, progress, certificates, API keys, and settings — will be permanently deleted.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {hasPassword && (
            <div className="space-y-1.5">
              <Label className="text-sm">Confirm your password</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your current password"
                className="bg-muted/50"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">
              Type <strong>DELETE</strong> to confirm
            </Label>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value.toUpperCase())}
              placeholder="DELETE"
              className="bg-muted/50 font-mono"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={confirmation !== "DELETE" || isLoading}
              className="flex-1"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete my account
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
