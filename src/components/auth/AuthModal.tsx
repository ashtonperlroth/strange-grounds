'use client';

import { useRouter } from 'next/navigation';
import { Mountain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

export function AuthModal({
  open,
  onOpenChange,
  title = 'Sign up to continue',
  description = 'Create a free account to save trips, share briefings, and monitor conditions.',
}: AuthModalProps) {
  const router = useRouter();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-emerald-50">
            <Mountain className="size-6 text-emerald-600" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-2">
          <Button
            className="w-full bg-emerald-600 hover:bg-emerald-700"
            onClick={() => {
              onOpenChange(false);
              router.push('/signup');
            }}
          >
            Create account
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onOpenChange(false);
              router.push('/login');
            }}
          >
            Sign in
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
