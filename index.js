addEventListener('fetch', event => {
  event.respondWith(handleRequest(event))
})

const RESPONSE_HEADERS = {
  'content-type': 'application/json;charset=UTF-8',
  'Access-Control-Allow-Origin': '*'
}

async function handleRequest(event) {
  const request = event.request
  const searchParams = new URL(request.url).searchParams

  const clipId = searchParams.get('clipId')
  if (clipId && !clipId.match(/^[\w-]{36}$/)) {
    return new Response(
      JSON.stringify({ 'Error': `Invalid clipId: ${clipId}` }), { headers: RESPONSE_HEADERS }
    )
  }

  const youtubeClipUrl = `https://www.youtube.com/clip/${clipId}`

  const cacheKey = new Request(youtubeClipUrl, request)
  const cache = caches.default
  const cachedResponse = await cache.match(cacheKey)
  if (cachedResponse) {
    return cachedResponse
  }

  const response = await fetch(youtubeClipUrl)
  const responseString = await response.text()
  let ogVideoUrlMetaTagMatch = responseString.match(/<meta property="og:video:url" content="([^"]+)">/)

  let ourApiResponse
  if (ogVideoUrlMetaTagMatch) {
    ourApiResponse = new Response(
      JSON.stringify({ iframeUrl: ogVideoUrlMetaTagMatch[1] }), { headers: RESPONSE_HEADERS }
    )
  } else {
    ourApiResponse = new Response(
      JSON.stringify({ 'Error': `Failed to extract embed url for clipId: ${clipId}` }), { headers: RESPONSE_HEADERS }
    )
  }

  event.waitUntil(cache.put(cacheKey, ourApiResponse.clone()))

  return ourApiResponse
}