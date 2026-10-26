import { initApiHost } from "@seer-pm/sdk";
import { getAppUrl } from "./utils";

initApiHost(getAppUrl());

// Showcase: route Seer API calls through /seer-api
if (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)) {
  const nativeFetch = window.fetch.bind(window);
  const sameOrigin = `${window.location.origin}/.netlify/functions/`;
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const path = url.startsWith(sameOrigin) ? url.slice(window.location.origin.length) : url;
    if (!path.startsWith("/.netlify/functions/")) return nativeFetch(input, init);
    return input instanceof Request
      ? nativeFetch(new Request(`/seer-api${path}`, input), init)
      : nativeFetch(`/seer-api${path}`, init);
  };
}
