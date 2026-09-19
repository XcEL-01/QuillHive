import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, ChevronLeft, ChevronRight, Send } from "lucide-react";
import type { AdminProps } from "./types";
import { useAdminFetch } from "../hooks/useAdminFetch";

export default function AdminUsers({ token, toast }: AdminProps) {
  const fetchAdmin = useAdminFetch(token);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [noticeUser, setNoticeUser] = useState<any | null>(null);
  const [notice, setNotice] = useState("");
  const [sending, setSending] = useState(false);
  useEffect(() => { setLoading(true); void fetchAdmin(`/api/admin/users?page=${page}&limit=25`).then((d) => setUsers(d.users ?? d)).catch((err) => toast({ title: "Could not load users", description: err.message, variant: "destructive" })).finally(() => setLoading(false)); }, [fetchAdmin, toast, page]);
  const sendNotice = async () => {
    if (!noticeUser || !notice.trim()) return;
    setSending(true);
    try {
      await fetchAdmin(`/api/admin/users/${noticeUser.id}/notice`, { method: "POST", body: JSON.stringify({ message: notice.trim() }) });
      toast({ title: "Notice sent", description: `Delivered to ${noticeUser.displayName || noticeUser.username}.` });
      setNoticeUser(null);
      setNotice("");
    } catch (err: any) {
      toast({ title: "Could not send notice", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };
  const filtered = users.filter((u) => `${u.displayName} ${u.username} ${u.email}`.toLowerCase().includes(search.toLowerCase()));
  return <>
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, handle, or email" className="pl-9" /></div>
        <p className="text-xs text-muted-foreground">{filtered.length} visible users</p>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
        <div className="hidden grid-cols-[minmax(0,1fr)_100px_100px_120px] gap-4 border-b border-border/70 bg-muted/30 px-5 py-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:grid"><span>User</span><span>Role</span><span>Status</span><span>Action</span></div>
        {loading ? <div className="space-y-3 p-5">{[1, 2, 3, 4].map((row) => <div key={row} className="h-12 animate-pulse rounded bg-muted" />)}</div> : filtered.length === 0 ? <div className="p-12 text-center"><p className="text-sm font-medium">No users found</p><p className="mt-1 text-xs text-muted-foreground">Try a different search.</p></div> : <div className="divide-y divide-border/60">{filtered.map((u) => <div key={u.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_100px_100px_120px] sm:items-center"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">{u.displayName?.[0] ?? u.username?.[0] ?? "?"}</div><div className="min-w-0"><p className="truncate text-sm font-medium">{u.displayName || "Unnamed user"}</p><p className="truncate text-xs text-muted-foreground">@{u.username} · {u.email}</p></div></div><Badge variant="outline" className="w-fit text-[10px] capitalize">{u.role}</Badge><Badge variant={u.isBanned ? "destructive" : "secondary"} className="w-fit text-[10px]">{u.isBanned ? "Banned" : "Active"}</Badge><Button variant="outline" size="sm" className="w-fit" onClick={() => setNoticeUser(u)}><Send className="mr-1.5 h-3.5 w-3.5" />Send Notice</Button></div>)}</div>}
      </div>
      <div className="flex items-center justify-end gap-2"><Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button><span className="text-xs text-muted-foreground">Page {page}</span><Button variant="outline" size="sm" disabled={users.length < 25} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
    </section>
    <Dialog open={!!noticeUser} onOpenChange={(open) => { if (!open) { setNoticeUser(null); setNotice(""); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Send official notice</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">This will notify {noticeUser?.displayName || noticeUser?.username} in QuillHive and by email.</p>
        <Textarea value={notice} onChange={(event) => setNotice(event.target.value)} placeholder="Write your message..." maxLength={5000} rows={5} />
        <DialogFooter><Button variant="outline" onClick={() => setNoticeUser(null)}>Cancel</Button><Button onClick={() => void sendNotice()} disabled={sending || !notice.trim()}><Send className="mr-2 h-4 w-4" />{sending ? "Sending..." : "Send"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}