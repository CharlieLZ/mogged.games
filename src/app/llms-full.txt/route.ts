import {
  buildLlmsText,
  createPlainTextDiscoveryResponse,
} from '../../shared/lib/site-discovery';

export function GET() {
  return createPlainTextDiscoveryResponse(buildLlmsText({ full: true }));
}
