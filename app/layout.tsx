import './globals.css'
export const metadata = { title: 'Prospyr Dashboard', description: 'AI-powered business operations dashboard' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-slate-900 text-white min-h-screen">{children}</body></html>
}
