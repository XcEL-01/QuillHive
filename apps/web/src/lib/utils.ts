import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: string): string {
  if (!date) return "";
  const now = new Date();
  const past = new Date(date);
  const diff = now.getTime() - past.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  if (weeks < 4) return `${weeks}w`;
  if (months < 12) return `${months}mo`;
  return `${years}y`;
}

export function formatCount(n: number): string {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function truncate(str: string, len: number): string {
  if (!str) return "";
  if (str.length <= len) return str;
  return str.slice(0, len) + "…";
}

export function stripHtml(html: string): string {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.textContent || div.innerText || "";
}

export function getInitials(name: string): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function readingTime(text: string): string {
  const words = text.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / 200);
  return `${minutes} min read`;
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return function (this: any, ...args: Parameters<T>) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  } as T;
}

export const ROLES = [
  "Writer",
  "Poet",
  "Novelist",
  "Blogger",
  "Artist",
  "Illustrator",
  "Photographer",
  "Musician",
  "Filmmaker",
  "Designer",
  "Other",
] as const;

export const POST_TYPES = [
  { value: "article", label: "Article" },
  { value: "spark", label: "Spark" },
  { value: "artwork", label: "Motion" },
  { value: "blog", label: "Article" },
  { value: "story", label: "Story" },
  { value: "poem", label: "Story" },
] as const;

export const REACTION_EMOJIS: Record<string, string> = {
  heart: "❤️",
  wow: "😮",
  haha: "😂",
  sad: "😢",
  clap: "👏",
  fire: "🔥",
};

export const CATEGORIES = [
  "Fiction",
  "Non-Fiction",
  "Poetry",
  "Essays",
  "Reviews",
  "Tutorials",
  "Photography",
  "Digital Art",
  "Traditional Art",
  "Music",
  "Film",
  "Other",
] as const;
