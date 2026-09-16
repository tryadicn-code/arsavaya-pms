import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const raw = (env as Record<string, unknown>).ENVIRONMENT;
  const environment = raw === 'development' ? 'development' : 'production';

  const url = new URL(req.url);

  if (environment === 'production') {
    const teamDomain = (env as Record<string, unknown>).CF_ACCESS_TEAM_DOMAIN;
    if (typeof teamDomain === 'string' && teamDomain.length > 0) {
      const logoutUrl = new URL(`https://${teamDomain}/cdn-cgi/access/logout`);
      logoutUrl.searchParams.set('redirect_url', new URL('/', url).toString());
      return Response.redirect(logoutUrl, 302);
    }
    return Response.redirect(new URL('/', url), 302);
  }

  return Response.redirect(
    new URL('/signout-with-chatgpt?return_to=/', url),
    302,
  );
}