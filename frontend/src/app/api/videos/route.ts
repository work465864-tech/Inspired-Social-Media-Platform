import type { NextRequest } from 'next/server';
import { handleVideoPageRequest } from '../../../features/video-provider/services/videoApiRoute';

export function GET(request: NextRequest) {
  return handleVideoPageRequest(request, 'feed');
}
