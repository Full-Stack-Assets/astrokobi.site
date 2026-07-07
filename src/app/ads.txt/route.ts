// Serves /ads.txt to authorize the AdSense seller. When no publisher id is
// configured (siteConfig.adsenseClient and NEXT_PUBLIC_ADSENSE_CLIENT both
// empty), serve a comment-only file instead of a malformed record — crawlers
// treat "google.com, , DIRECT, …" as a spec violation.
import { ADSENSE_CLIENT } from '@/lib/ads';

export const dynamic = 'force-dynamic';

export function GET() {
  // "ca-pub-1234..." -> "pub-1234..."; f08c47fec0942fa0 is Google's fixed cert id.
  const publisherId = ADSENSE_CLIENT.trim().replace(/^ca-/, '');
  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : '# No advertising accounts are authorized to sell this inventory yet.\n';
  return new Response(body, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
