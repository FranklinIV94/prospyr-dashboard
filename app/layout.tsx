import './globals.css'
import { Providers } from '../providers/NextAuthProvider'

export const metadata = {
  title: 'Prospyr Control',
  description: 'Operations Hub for Prospyr Inc.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
