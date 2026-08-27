import { useState } from 'react';
import { useLocation } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { getStoredToken } from '@/lib/api';
import { Plus, X, Loader2, BarChart2, ChevronDown } from 'lucide-react';

const DURATION_OPTIONS = [
  { value: '1', label: '1 hour' },
  { value: '6', label: '6 hours' },
  { value: '24', label: '1 day' },
  { value: '72', label: '3 days' },
  { value: '168', label: '7 days' },
];

export default function PollNew() {
  const [, navigate] = useLocation();
  const { user } = useAuthStore();
  const { toast } = useToast();

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [durationHours, setDurationHours] = useState('24');
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [showResultsBefore, setShowResultsBefore] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (i: number) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const updateOption = (i: number, val: string) => {
    setOptions(options.map((o, idx) => (idx === i ? val.slice(0, 100) : o)));
  };

  const validOptions = options.filter(o => o.trim().length > 0);
  const canPublish = question.trim().length >= 3 && validOptions.length >= 2;

  const handlePublish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    try {
      const token = getStoredToken();
      const res = await fetch('/api/polls/standalone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          question: question.trim(),
          options: validOptions,
          durationHours: Number(durationHours),
          multipleChoice,
          showResultsBeforeVoting: showResultsBefore,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Failed to create poll');
      }
      const data = await res.json() as { pollId?: number; postId?: number };

      toast({ title: 'Poll published!', description: 'Your poll is live.' });
      navigate(data.postId ? `/post/${data.postId}` : '/');
    } catch (e) {
      toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">New Poll</h1>
            <p className="text-xs text-muted-foreground">Ask your audience a question</p>
          </div>
        </div>

        {/* Question */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Question <span className="text-destructive">*</span></Label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value.slice(0, 280))}
            placeholder="Ask your question..."
            rows={3}
            className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
          <div className="flex justify-end">
            <span className={`text-xs ${question.length > 250 ? 'text-amber-500' : 'text-muted-foreground'}`}>{question.length}/280</span>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Options <span className="text-xs font-normal text-muted-foreground">(min 2, max 6)</span></Label>
          {options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input
                value={opt}
                onChange={e => updateOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                maxLength={100}
                className="rounded-xl"
              />
              <button
                onClick={() => removeOption(i)}
                disabled={options.length <= 2}
                className="p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          {options.length < 6 && (
            <Button variant="outline" size="sm" onClick={addOption} className="rounded-xl gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Add option
            </Button>
          )}
        </div>

        {/* Settings */}
        <div className="border border-border rounded-2xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold hover:bg-muted/40 transition-colors"
            onClick={() => setSettingsOpen(v => !v)}
          >
            Poll settings
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
          </button>
          {settingsOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-border/50">
              <div className="space-y-1.5 pt-3">
                <Label className="text-xs text-muted-foreground">Duration</Label>
                <Select value={durationHours} onValueChange={setDurationHours}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Allow multiple choice</p>
                  <p className="text-xs text-muted-foreground">Voters can select more than one option</p>
                </div>
                <Switch checked={multipleChoice} onCheckedChange={setMultipleChoice} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Show results before voting</p>
                  <p className="text-xs text-muted-foreground">Voters see results without voting first</p>
                </div>
                <Switch checked={showResultsBefore} onCheckedChange={setShowResultsBefore} />
              </div>
            </div>
          )}
        </div>

        {/* Live Preview */}
        {question.trim() && validOptions.length >= 1 && (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Preview</span>
              </div>
              <p className="font-semibold text-sm">{question || 'Your question...'}</p>
              <div className="space-y-2">
                {(validOptions.length > 0 ? validOptions : ['Option 1', 'Option 2']).map((opt, i) => (
                  <div key={i} className="h-9 rounded-lg border border-border flex items-center px-3 text-sm text-muted-foreground bg-muted/30">
                    {opt || `Option ${i + 1}`}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Badge variant="outline" className="text-xs">{DURATION_OPTIONS.find(d => d.value === durationHours)?.label}</Badge>
                {multipleChoice && <Badge variant="outline" className="text-xs">Multiple choice</Badge>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Publish */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={() => navigate('/')} className="rounded-xl flex-1">Cancel</Button>
          <Button
            onClick={handlePublish}
            disabled={!canPublish || publishing}
            className="rounded-xl flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {publishing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Publishing...</> : 'Publish Poll'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
