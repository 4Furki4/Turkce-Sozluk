export async function GET(request: Request) {
    return Response.redirect(new URL("/sitemap.xml", request.url), 308);
}
