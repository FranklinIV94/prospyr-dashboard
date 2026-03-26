import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export function middleware(req) {
  // API routes should not be redirected by auth middleware
  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // For all other routes, use withAuth (which will redirect if not authenticated)
  const token = req.nextauth.token
  if (!token && !req.nextUrl.pathname.startsWith('/login')) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', req.url)
    return NextResponse.redirect(loginUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login).*)',
  ],
}
