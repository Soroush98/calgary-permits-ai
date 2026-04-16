import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

// Handles the redirect back from OAuth (Google) and from email confirmation.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);

    // PKCE code_verifier cookie may be gone (user closed tab/browser before
    // clicking the confirmation link). The email *is* confirmed on Supabase's
    // side, so redirect home with a friendly message instead of an error.
    return NextResponse.redirect(`${origin}/?confirmed=true`);
  }

  return NextResponse.redirect(`${origin}/?auth_error=callback_failed`);
}
