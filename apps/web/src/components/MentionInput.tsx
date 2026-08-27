import { useState, useRef, useCallback, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getStoredToken } from '@/lib/api';
import { clsx } from 'clsx';

interface User {
  id: number;
  username: string;
  displayName: string;
  avatarUrl?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
  maxLength?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function MentionInput({
  value,
  onChange,
  placeholder,
  className,
  rows = 3,
  maxLength,
  onKeyDown,
}: MentionInputProps) {
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const token = getStoredToken();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/mentions/search?q=${encodeURIComponent(query)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const users = await res.json();
      setSuggestions(Array.isArray(users) ? users : []);
      setShowSuggestions(Array.isArray(users) && users.length > 0);
      setSelectedIndex(0);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    const cursor = e.target.selectionStart ?? newValue.length;
    const textBeforeCursor = newValue.slice(0, cursor);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      const start = cursor - mentionMatch[0].length;
      setMentionStart(start);
      setMentionQuery(query);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchUsers(query), 200);
    } else {
      setShowSuggestions(false);
      setMentionQuery('');
      setMentionStart(-1);
    }
  };

  const insertMention = (user: User) => {
    if (mentionStart < 0) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + mentionQuery.length + 1);
    const newValue = `${before}@${user.username} ${after}`;
    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setMentionStart(-1);

    setTimeout(() => {
      const newCursor = before.length + user.username.length + 2;
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
      textareaRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        if (suggestions[selectedIndex]) {
          e.preventDefault();
          insertMention(suggestions[selectedIndex]);
          return;
        }
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={clsx(
          'w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
          'placeholder:text-muted-foreground transition-colors',
          className
        )}
      />

      {showSuggestions && (
        <div className="absolute z-50 bottom-full mb-1 left-0 w-64 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">Searching...</div>
          ) : suggestions.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">No users found</div>
          ) : (
            suggestions.map((user, idx) => (
              <button
                key={user.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(user); }}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors text-left',
                  idx === selectedIndex && 'bg-muted'
                )}
              >
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarImage src={user.avatarUrl || ''} />
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user.displayName?.slice(0, 2) || user.username?.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{user.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
