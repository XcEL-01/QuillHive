import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  ShieldCheck, Plus, Trash2, DollarSign, CheckCircle2,
  FileText, Users, Sparkles, Copy, Check, Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: string;
}

interface Collaborator {
  displayName: string;
  share: number;
}

interface SmartProjectDraftProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultTitle?: string;
  collaborators?: Collaborator[];
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export function SmartProjectDraft({ open, onOpenChange, defaultTitle = '', collaborators = [] }: SmartProjectDraftProps) {
  const { toast } = useToast();
  const [projectTitle, setProjectTitle] = useState(defaultTitle);
  const [currency, setCurrency]         = useState('USD');
  const [totalBudget, setTotalBudget]   = useState('');
  const [milestones, setMilestones]     = useState<Milestone[]>([
    { id: uid(), title: 'Discovery & Brief', description: 'Scope alignment, reference gathering, project kick-off', amount: '' },
    { id: uid(), title: 'Delivery',          description: 'Completed deliverable submitted for review',              amount: '' },
  ]);
  const [escrowConfirmed, setEscrowConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const addMilestone = () =>
    setMilestones(prev => [...prev, { id: uid(), title: '', description: '', amount: '' }]);

  const removeMilestone = (id: string) =>
    setMilestones(prev => prev.filter(m => m.id !== id));

  const updateMilestone = (id: string, field: keyof Milestone, value: string) =>
    setMilestones(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));

  const totalAllocated = milestones.reduce((sum, m) => sum + (parseFloat(m.amount) || 0), 0);
  const totalVal        = parseFloat(totalBudget) || 0;
  const remainingBudget = totalVal - totalAllocated;

  const autoSplit = () => {
    if (!totalVal || milestones.length === 0) return;
    const each = (totalVal / milestones.length).toFixed(2);
    setMilestones(prev => prev.map(m => ({ ...m, amount: each })));
  };

  const generateContractText = () => {
    const lines = [
      `SMART PROJECT AGREEMENT — QuillHive`,
      ``,
      `Project: ${projectTitle || '(untitled)'}`,
      `Total Budget: ${currency} ${totalBudget || '0'}`,
      `Platform Commission: 0% (QuillHive charges no take-rate)`,
      ``,
      `MILESTONES`,
      ...milestones.map((m, i) => `  ${i + 1}. ${m.title} — ${currency} ${m.amount || '0'}\n     ${m.description}`),
    ];

    if (collaborators.length > 1) {
      lines.push(``, `FEE SPLIT`);
      collaborators.forEach(c => lines.push(`  • ${c.displayName}: ${c.share}%`));
    }

    lines.push(
      ``,
      `PAYMENT TERMS`,
      `  Funds held in simulated escrow until milestone approval.`,
      `  Standard processor fee (≈2.9% + $0.30) applied at payout.`,
      `  Zero platform commission by QuillHive.`,
      ``,
      `Generated ${new Date().toLocaleDateString()} via QuillHive Smart Project Draft`
    );
    return lines.join('\n');
  };

  const copyContract = () => {
    navigator.clipboard.writeText(generateContractText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: 'Contract copied to clipboard' });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Smart Project Draft</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                0% platform commission · Simulated escrow structure
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-6">
          {/* Project Title + Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Project Title</Label>
              <Input
                value={projectTitle}
                onChange={e => setProjectTitle(e.target.value)}
                placeholder="e.g. Brand Narrative Video"
                className="h-9 rounded-xl text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Total Budget</Label>
              <div className="flex gap-1">
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="h-9 w-20 rounded-xl border border-border/60 bg-background text-sm px-2"
                >
                  {['USD', 'EUR', 'GBP', 'CAD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={totalBudget}
                  onChange={e => setTotalBudget(e.target.value)}
                  className="h-9 rounded-xl flex-1 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Collaborator split (if multi-creator) */}
          {collaborators.length > 1 && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">Auto-Split for Collective</p>
              </div>
              <div className="space-y-2">
                {collaborators.map(c => {
                  const amount = totalVal ? ((c.share / 100) * totalVal).toFixed(2) : '—';
                  return (
                    <div key={c.displayName} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{c.displayName}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{c.share}%</Badge>
                        <span className="text-muted-foreground">{currency} {amount}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Milestones */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Milestones & Deliverables</Label>
              <div className="flex gap-2">
                {totalVal > 0 && (
                  <Button type="button" size="sm" variant="outline" onClick={autoSplit} className="h-7 text-xs rounded-lg gap-1">
                    <Sparkles className="w-3 h-3" /> Auto-split
                  </Button>
                )}
                <Button type="button" size="sm" variant="outline" onClick={addMilestone} className="h-7 text-xs rounded-lg gap-1 min-w-[44px]">
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            </div>
            {milestones.map((m, idx) => (
              <div key={m.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground mt-0.5">#{idx + 1}</span>
                  <div className="flex-1 space-y-2 min-w-0">
                    <Input
                      placeholder="Milestone title"
                      value={m.title}
                      onChange={e => updateMilestone(m.id, 'title', e.target.value)}
                      className="h-8 rounded-lg text-sm"
                    />
                    <Textarea
                      placeholder="What must be delivered?"
                      value={m.description}
                      onChange={e => updateMilestone(m.id, 'description', e.target.value)}
                      className="rounded-lg text-xs min-h-[56px]"
                    />
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <Input
                        type="number"
                        min={0}
                        placeholder="Amount"
                        value={m.amount}
                        onChange={e => updateMilestone(m.id, 'amount', e.target.value)}
                        className="h-7 rounded-lg text-xs w-28"
                      />
                      <span className="text-xs text-muted-foreground">{currency}</span>
                    </div>
                  </div>
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(m.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors mt-0.5 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {totalVal > 0 && (
              <div className={`flex justify-between text-xs px-1 font-medium ${remainingBudget < 0 ? 'text-rose-500' : 'text-muted-foreground'}`}>
                <span>Allocated: {currency} {totalAllocated.toFixed(2)}</span>
                <span>Remaining: {currency} {remainingBudget.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Simulated Escrow Status */}
          <div className={`rounded-2xl border p-4 transition-all ${escrowConfirmed ? 'border-emerald-500/40 bg-emerald-500/8' : 'border-border/60 bg-card'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${escrowConfirmed ? 'bg-emerald-500' : 'bg-muted'}`}>
                  {escrowConfirmed
                    ? <CheckCircle2 className="w-5 h-5 text-white" />
                    : <Lock className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
                <div>
                  <p className={`text-sm font-semibold ${escrowConfirmed ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                    {escrowConfirmed ? 'Simulated Escrow Deposited ✓' : 'Simulated Escrow'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {escrowConfirmed
                      ? 'Funds confirmed. Release on milestone approval.'
                      : 'Confirm to mark funds as held pending deliverables.'}
                  </p>
                </div>
              </div>
              {!escrowConfirmed && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEscrowConfirmed(true)}
                  className="rounded-xl text-xs h-8 min-w-[44px]"
                >
                  Confirm
                </Button>
              )}
            </div>
          </div>

          {/* 0% Commission Notice */}
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-violet-600 dark:text-violet-400">0% Platform Commission.</span>{' '}
              QuillHive takes no cut of creator earnings. Payment processor fees (typically 2.9% + $0.30) are the only transaction cost. Funds are distributed directly between parties upon milestone sign-off.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={copyContract}
              className="flex-1 h-11 rounded-xl gap-2 text-sm"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Contract'}
            </Button>
            <Button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 rounded-xl text-sm"
            >
              Save Draft
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
