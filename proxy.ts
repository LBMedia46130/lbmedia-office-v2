import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const isLogin = path === "/login";

  // Le cron Vercel et son appel serveur vers LinkedIn utilisent CRON_SECRET.
  const cronSecret = process.env.CRON_SECRET;
  const isCronEndpoint = path === "/api/scheduler/publish-due";
  const isLinkedInPublish = /^\/api\/publications\/[^/]+\/publish-linkedin$/.test(path) && request.method === "POST";
  const isCronAuthorized = !!cronSecret && request.headers.get("authorization") === `Bearer ${cronSecret}`;
  if (isCronAuthorized && (isCronEndpoint || isLinkedInPublish)) return NextResponse.next();

  // IMPORTANT : les callbacks OAuth doivent être inventoriés avant déploiement.
  // Ne pas les ouvrir via une règle générique "callback".

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const allowedUserId = process.env.OFFICE_ALLOWED_USER_ID;
  if (!supabaseUrl || !supabaseKey || !allowedUserId) {
    if (isApi) return NextResponse.json({ success: false, message: "Authentification non configurée." }, { status: 503 });
    if (isLogin) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user }, error } = await supabase.auth.getUser();
  const authorized = !error && user?.id === allowedUserId;
  if (isLogin) {
    if (authorized) {
      const redirect = NextResponse.redirect(new URL("/", request.url));
      response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
      return redirect;
    }
    return response;
  }
  if (authorized) return response;
  if (isApi) return NextResponse.json({ success: false, message: "Accès non autorisé." }, { status: 401 });
  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};