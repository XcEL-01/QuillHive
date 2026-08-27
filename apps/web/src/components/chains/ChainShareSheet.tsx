import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { useIsMobile } from '@/hooks/use-mobile';
import { Link2, Copy, Check, Send, Twitter, Loader2 } from 'lucide-react';

interface ChainShareSheetProps {
  open: boolean;
  onClose: () => void;
  chainId: number;
  chainTitle: string;
  isOwner: boolean;
}

function Content({ chainId, chainTitle, isOwner, onClose }: Omit<ChainShareSheetProps, 'open'>) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState('');

  const chainUrl = `${window.location.origin}/chains/${chainId}`;
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Join my chain: "${chainTitle}" on QuillHive`)}&url=${encodeURIComponent(chainUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chainUrl);
      setCopied(true);
      toast({ title: 'Link copied!' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Could not copy', variant: 'destructive' });
    }
  };

  const { mutate: sendInvite, isPending } = useMutation({
    mutationFn: () =>
      (apiRequest('POST', `/api/chains/${chainId}/invites`, { username: username.trim() }) as unknown) as Promise<{ invitedUser: string }>,
    onSuccess: (d) => {
      toast({ title: `Invite sent to ${d.invitedUser}!` });
      setUsername('');
    },
    onError: (err: any) => {
      toast({ title: err?.message ?? 'Could not send invite', variant: 'destructive' });
    },
  });

  return (
    <div className="p-5 space-y-5">
      {/* Chain link */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Shareable Link
        </p>
        <div className="flex gap-2">
          <div className="flex-1 bg-muted rounded-xl px-3 py-2 flex items-center gap-2 min-w-0">
            <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-foreground truncate">{chainUrl}</span>
          </div>
          <Button
            size="sm"
            onClick={handleCopy}
            className="rounded-xl shrink-0 gap-1.5"
            variant={copied ? 'secondary' : 'default'}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>

      {/* Social share */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Share on
        </p>
        <div className="flex gap-2">
          <a
            href={twitterUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            <Twitter className="w-3.5 h-3.5 text-sky-500" /> X / Twitter
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            <Link2 className="w-3.5 h-3.5 text-primary" /> Copy Link
          </button>
        </div>
      </div>

      {/* Invite by username (creator only) */}
      {isOwner && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Invite a Creator
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && username.trim() && sendInvite()}
              className="rounded-xl flex-1 text-sm"
            />
            <Button
              size="sm"
              onClick={() => sendInvite()}
              disabled={!username.trim() || isPending}
              className="rounded-xl gap-1.5 shrink-0"
            >
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Invite
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            They'll get an in-app notification with a link to this chain.
          </p>
        </div>
      )}

      <Button variant="ghost" onClick={onClose} className="w-full rounded-xl text-xs">
        Close
      </Button>
    </div>
  );
}

export function ChainShareSheet({ open, onClose, chainId, chainTitle, isOwner }: ChainShareSheetProps) {
  const isMobile = useIsMobile();

  const sharedTitle = (
    <span className="flex items-center gap-2">
      <Link2 className="w-4 h-4 text-primary" /> Share Chain
    </span>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="rounded-t-3xl pb-8 px-0">
          <SheetHeader className="px-5 pb-2">
            <SheetTitle>{sharedTitle}</SheetTitle>
          </SheetHeader>
          <Content chainId={chainId} chainTitle={chainTitle} isOwner={isOwner} onClose={onClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-2xl max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle>{sharedTitle}</DialogTitle>
        </DialogHeader>
        <Content chainId={chainId} chainTitle={chainTitle} isOwner={isOwner} onClose={onClose} />
      </DialogContent>
    </Dialog>
  );
}
