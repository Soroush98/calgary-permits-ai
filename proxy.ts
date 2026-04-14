import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  // Admin-slug rewrite: public URL /admin-<SLUG>/... maps to internal /admin/...
  // Direct /admin access is hidden (404 via redirect to home).
  const slug = process.env.ADMIN_SLUG;
  const { pathname } = request.nextUrl;
  if (slug) {
    const pubPage = `/admin-${slug}`;
    const pubApi = `/api/admin-${slug}`;
    if (pathname === pubPage || pathname.startsWith(`${pubPage}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin' + pathname.slice(pubPage.length);
      return NextResponse.rewrite(url);
    }
    if (pathname === pubApi || pathname.startsWith(`${pubApi}/`)) {
      const url = request.nextUrl.clone();
      url.pathname = '/api/admin' + pathname.slice(pubApi.length);
      return NextResponse.rewrite(url);
    }
  }
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/api/admin' || pathname.startsWith('/api/admin/')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (items) => {
          for (const { name, value } of items) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of items) response.cookies.set(name, value, options);
        },
      },
    },
  );

  // Refresh the session cookie if needed; result discarded.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
