import { useState } from 'react';
import { Plus, Trash2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export interface DraftPoll {
  question: string;
  options: string[];
  allowMultiple: boolean;
}

interface Props {
  value: DraftPoll | null;
  onChange: (next: DraftPoll | null) => void;
}

export function PollComposer({ value, onChange }: Props) {
  const [enabled, setEnabled] = useState(!!value);

  function ensureEnabled() {
    if (!enabled) {
      setEnabled(true);
      onChange({ question: '', options: ['', ''], allowMultiple: false });
    }
  }

  function update(patch: Partial<DraftPoll>) {
    onChange({ ...(value ?? { question: '', options: ['', ''], allowMultiple: false }), ...patch });
  }

  return (
    <div className="border border-border rounded-xl p-4 bg-card/40">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">Add a poll</span>
        </div>
        <Switch
          checked={enabled}
          onCheckedChange={(checked) => {
            setEnabled(checked);
            if (checked) ensureEnabled();
            else onChange(null);
          }}
        />
      </div>

      {enabled && value && (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Question</Label>
            <Input
              value={value.question}
              onChange={(e) => update({ question: e.target.value })}
              placeholder="Ask your readers something…"
              maxLength={280}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Options</Label>
            {value.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const next = [...value.options];
                    next[idx] = e.target.value;
                    update({ options: next });
                  }}
                  placeholder={`Option ${idx + 1}`}
                  maxLength={120}
                />
                {value.options.length > 2 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => update({ options: value.options.filter((_, i) => i !== idx) })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            {value.options.length < 8 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => update({ options: [...value.options, ''] })}
                className="gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add option
              </Button>
            )}
          </div>

          <label className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Allow multiple selections</span>
            <Switch
              checked={value.allowMultiple}
              onCheckedChange={(checked) => update({ allowMultiple: checked })}
            />
          </label>
        </div>
      )}
    </div>
  );
}
