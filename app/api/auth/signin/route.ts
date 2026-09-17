import { env } from 'cloudflare:workers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const raw = env.ENVIRONMENT;
  const environment = raw === 'development' ? 'development' : 'production';

  const url = new URL(req.url);
  const returnTo = url.searchParams.get('return_to') ?? '/';
  const safeReturnTo =
    returnTo.startsWith('/') && !returnTo.startsWith('//') ? returnTo : '/';

  if (environment === 'production') {
    // Cloudflare Access intercepts unauthenticated requests once configured.
    return Response.redirect(new URL('/', url), 302);
  }

  const target = `/signin-with-chatgpt?return_to=${encodeURIComponent(safeReturnTo)}`;
  return Response.redirect(new URL(target, url), 302);
}