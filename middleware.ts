import { withAuth } from 'next-auth/middleware'

// This middleware handles auth for the dashboard pages
// API routes are handled separately

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

// API routes under /api/prospyr are handled separately 
// and should NOT go through this auth middleware
export const config = {
  matcher: [
    // Protect all paths EXCEPT:
    // - API routes (handled by their own auth if needed)
    // - Static files
    // - Login page
    '/((?!api/|login|_next/static|_next/image|favicon.ico).*)',
  ],
}
