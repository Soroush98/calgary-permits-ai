import { getMe } from '@/lib/me';

export async function GET() {
  return Response.json(await getMe());
}
