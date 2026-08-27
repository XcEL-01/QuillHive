import { BookOpen, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReaderModeToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <Button
      size="sm"
      variant={active ? 'default' : 'ghost'}
      onClick={onToggle}
      className="gap-2 text-muted-foreground data-[state=on]:text-foreground"
      title={active ? 'Exit reader mode' : 'Enter reader mode'}
    >
      {active ? <X className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
      {active ? 'Exit Reader' : 'Reader'}
    </Button>
  );
}
