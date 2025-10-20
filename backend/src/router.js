export function route(request) {
  const url = new URL(request.url);
  const key = request.method + " " + url.pathname;
  return key;
}