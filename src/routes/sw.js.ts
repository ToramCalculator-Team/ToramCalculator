import sw from '~/entry-serviceworker?url';

export function GET() {
    return new Response(`import '${sw}';`, { headers: { 'content-type': 'application/javascript' } });
}