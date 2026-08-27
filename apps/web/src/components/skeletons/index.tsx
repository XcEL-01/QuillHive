import { cn } from '@/lib/utils';

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function PostCardSkeleton() {
  return (
    <div className="p-4 border-b border-border/50 space-y-3">
      <div className="flex items-center gap-3">
        <Bone className="w-10 h-10 rounded-full shrink-0" />
        <div className="space-y-1.5 flex-1">
          <Bone className="h-3.5 w-32" />
          <Bone className="h-3 w-20" />
        </div>
      </div>
      <Bone className="h-4 w-3/4" />
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-2/3" />
      <div className="flex items-center gap-6 pt-1">
        <Bone className="h-4 w-10" />
        <Bone className="h-4 w-10" />
        <Bone className="h-4 w-10" />
        <Bone className="h-4 w-10" />
      </div>
    </div>
  );
}

export function FeedSkeleton() {
  return (
    <div className="divide-y divide-border/50">
      <PostCardSkeleton />
      <PostCardSkeleton />
      <PostCardSkeleton />
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="space-y-0">
      <Bone className="h-48 w-full rounded-none" />
      <div className="px-4 pb-4 -mt-10 space-y-3 relative">
        <Bone className="w-20 h-20 rounded-full border-4 border-background" />
        <Bone className="h-5 w-48" />
        <Bone className="h-3.5 w-64" />
        <Bone className="h-3 w-full max-w-xs" />
        <div className="flex gap-4 pt-1">
          <Bone className="h-4 w-20" />
          <Bone className="h-4 w-20" />
          <Bone className="h-4 w-20" />
        </div>
        <div className="flex gap-2 pt-2 border-t border-border">
          <Bone className="h-8 w-20 rounded-full" />
          <Bone className="h-8 w-20 rounded-full" />
          <Bone className="h-8 w-20 rounded-full" />
          <Bone className="h-8 w-20 rounded-full" />
          <Bone className="h-8 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function NotificationRowSkeleton() {
  return (
    <div className="flex items-start gap-3 p-4 border-b border-border/50">
      <Bone className="w-9 h-9 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Bone className="h-3.5 w-3/4" />
        <Bone className="h-3 w-1/2" />
      </div>
      <Bone className="h-3 w-12 shrink-0" />
    </div>
  );
}

export function ConversationRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 border-b border-border/50">
      <Bone className="w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Bone className="h-3.5 w-28" />
        <Bone className="h-3 w-44" />
      </div>
      <Bone className="h-3 w-10 shrink-0" />
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div>
      {Array.from({ length: 6 }).map((_, i) => <ConversationRowSkeleton key={i} />)}
    </div>
  );
}

export function AnalyticsCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-border space-y-3">
      <div className="flex justify-between items-start">
        <Bone className="h-3.5 w-24" />
        <Bone className="w-8 h-8 rounded-lg" />
      </div>
      <Bone className="h-8 w-20" />
      <Bone className="h-3 w-16" />
      <Bone className="h-14 w-full rounded-lg" />
    </div>
  );
}

export function AnalyticsGridSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {Array.from({ length: 4 }).map((_, i) => <AnalyticsCardSkeleton key={i} />)}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-border space-y-4">
      <div className="flex justify-between">
        <Bone className="h-4 w-40" />
        <Bone className="h-6 w-24 rounded-full" />
      </div>
      <Bone className="h-[300px] w-full rounded-xl" />
    </div>
  );
}

export function PromotionsRowSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 border-b border-border/50">
      <Bone className="h-5 w-16 rounded-full shrink-0" />
      <Bone className="h-4 w-48 flex-1" />
      <Bone className="h-5 w-16 rounded-full shrink-0" />
      <Bone className="h-4 w-12 shrink-0" />
      <Bone className="h-8 w-20 rounded-lg shrink-0" />
    </div>
  );
}

export function WorkspaceCardSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-border space-y-3">
      <div className="flex items-center gap-3">
        <Bone className="w-10 h-10 rounded-xl shrink-0" />
        <Bone className="h-4 w-32" />
      </div>
      <Bone className="h-3 w-full" />
      <Bone className="h-3 w-3/4" />
      <Bone className="h-8 w-24 rounded-lg mt-2" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <AnalyticsGridSkeleton />
      <ChartSkeleton />
      <FeedSkeleton />
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
      <div className="space-y-1">
        {Array.from({ length: 6 }).map((_, i) => <Bone key={i} className="h-9 w-full rounded-lg" />)}
      </div>
      <div className="space-y-4">
        <Bone className="h-6 w-40" />
        <Bone className="h-12 w-full rounded-xl" />
        <Bone className="h-12 w-full rounded-xl" />
        <Bone className="h-24 w-full rounded-xl" />
        <Bone className="h-12 w-full rounded-xl" />
        <Bone className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export function SearchResultSkeleton({ type = 'person' }: { type?: 'person' | 'post' }) {
  if (type === 'person') {
    return (
      <div className="flex items-center gap-3 p-3 border-b border-border/50">
        <Bone className="w-10 h-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Bone className="h-3.5 w-32" />
          <Bone className="h-3 w-20" />
        </div>
        <Bone className="h-8 w-16 rounded-full shrink-0" />
      </div>
    );
  }
  return (
    <div className="flex gap-3 p-3 border-b border-border/50">
      <Bone className="w-16 h-16 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Bone className="h-3.5 w-3/4" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function LibraryItemSkeleton() {
  return (
    <div className="space-y-2">
      <Bone className="aspect-[4/3] w-full rounded-xl" />
      <Bone className="h-3.5 w-3/4" />
      <Bone className="h-3 w-1/2" />
    </div>
  );
}
