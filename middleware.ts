// Use next-auth middleware but ONLY protect pages, not API routes
import { withAuth } from 'next-auth/middleware'

// Only protect dashboard pages, NOT API routes
export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  // Only protect page routes, NOT /api/* routes
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - API routes (/api/*) - these handle their own auth
     * - Static files
     * - Login page
     */
    '/((?!api/).*)',
  ],
}
