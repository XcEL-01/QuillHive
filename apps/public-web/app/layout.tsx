export const metadata = {
  title: 'QuillHive — Where Creators Gather',
  description: 'A creative platform for writers, poets, novelists, and illustrators.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
