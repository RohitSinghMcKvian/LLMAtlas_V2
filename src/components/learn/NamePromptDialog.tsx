"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";

interface NamePromptDialogProps {
  open: boolean;
  onSubmit: (name: string) => void;
}

export function NamePromptDialog({ open, onSubmit }: NamePromptDialogProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) setName("");
  }, [open]);

  const valid = name.trim().length >= 2;

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!valid) return;
    onSubmit(name.trim());
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-center text-2xl">Your certificate awaits</DialogTitle>
          <DialogDescription className="text-center">
            What name should appear on your certificate? You can change it later in Settings.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            className="text-lg h-12 text-center"
          />
          <Button
            type="submit"
            size="lg"
            disabled={!valid}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-white font-semibold"
          >
            Claim my certificate →
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
