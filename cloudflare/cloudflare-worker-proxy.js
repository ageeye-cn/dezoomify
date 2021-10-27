/**
 * This is a cloudflare worker for dezoomify
 */

const MAX_REDIRECT = 3;

/**
 * Respond to the request
 * @param {Request} request
 */
async function handleRequest(request) {
    const url = new URL(request.url);
    let target_url = url.searchParams.get("url");
    let target_request = new Request(target_url, request);
    try {
      target_request.headers.set("Origin", new URL(target_url).origin);
    } catch(e) {
        console.log("Invalid URL: " + target_url, e);
    }
    target_request.headers.set("Referer", target_url.toString());
    const cookies = url.searchParams.get("cookies");
    if (cookies) target_request.headers.set("Cookie", cookies);
    console.log(`Making request to ${target_request.url} with headers ${
        JSON.stringify(Object.fromEntries(target_request.headers.entries()))
    }`);
    let response = await fetch(target_request);
    let location = response.headers.get("Location");
    for (let i = 0; i < MAX_REDIRECT && location; i++) {
        response = await fetch(location, target_request);
        location = response.headers.get("Location");
    }
    if (location) {
        response.headers.set("X-Disabled-Location", location);
        response.headers.set("Location", "");
    }
    response = new Response(response.body, response);
    const response_cookie = response.headers.get("Set-Cookie");
    if (response_cookie) response.headers.set("X-Set-Cookie", response_cookie);
    response.headers.delete("Set-Cookie");
    return response;
}

/**
 * Handle a fetch event
 * @param {Error} error
 */
async function handleError(error) {
    console.error(error);
    return new Response(error.toString(), { status: 500 });
}

addEventListener('fetch', evt => {
    const req = evt.request;
    console.log(req.url);
    let response = handleRequest(req).catch(handleError);
    evt.respondWith(response);
});
