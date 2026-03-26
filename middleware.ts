import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login
     * - /api/auth (NextAuth routes)
     * - /api/prospyr (all agent API routes - public)
     * - /_next/static (static files)
     * - /_next/image (image optimization)
     * - /favicon.ico
     */
    '/((?!login|api/auth|api/prospyr|_next/static|_next/image|favicon.ico).*)',
  ],
}
