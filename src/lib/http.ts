/* Implementation of a Tauri plugin-http compatible Fetcher
 *
 * Usage:
 *   import { HTTPClient } from "./lib/http.js";
 *   import { createTauriFetcher } from "./lib/tauri-fetcher.js";
 *
 *   const client = new HTTPClient({ fetcher: createTauriFetcher() });
 *
 * Notes:
 * - This implements the Fetcher type exported by src/lib/http.ts.
 * - It delegates the actual network calls to @tauri-apps/plugin-http.
 * - AbortSignal is supported best-effort: if a signal is aborted we reject
 *   with an error named "AbortError". The underlying Tauri request cannot be
 *   cancelled from JS in all runtimes, so this is a local cancellation.
 * - Responses are returned as standard Fetch Response objects so the rest of
 *   the SDK (which expects the Fetch API) will work unchanged.
 */

import { Fetcher } from "@openrouter/sdk";
import * as http from "@tauri-apps/plugin-http";
// import type { Fetcher } from "./http.js";

/** Create an Error that matches the DOM AbortError shape (fallback if DOMException not available). */
function makeAbortError(): Error {
  try {
    // DOMException exists in browser/webview environments
    return new DOMException("The operation was aborted.", "AbortError");
  } catch {
    const err = new Error("The operation was aborted.");
    // Give it the same shape as a DOM AbortError
    (err as any).name = "AbortError";
    return err;
  }
}

/** Convert Headers to a plain string->string map expected by the Tauri plugin. */
function headersToRecord(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    // Join multiple header values with ", " to preserve all values in a single string
    if (Object.prototype.hasOwnProperty.call(out, key)) {
      out[key] = `${out[key]}, ${value}`;
    } else {
      out[key] = value;
    }
  });
  return out;
}

/** Create a Fetcher that calls @tauri-apps/plugin-http under the hood. */
export function createTauriFetcher(): Fetcher {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    // Build a Request object so we can use the Web Fetch Request helpers
    const request =
      input instanceof Request
        ? input
        : new Request(input as RequestInfo, init);

    // Build headers
    const headers = headersToRecord(request.headers);

    // Obtain body as ArrayBuffer if present
    let bodyUint8: Uint8Array | undefined = undefined;
    try {
      // arrayBuffer() works for Request with most body types (string, blob, FormData will be serialized)
      const buf = await request.arrayBuffer();
      if (buf && buf.byteLength > 0) {
        bodyUint8 = new Uint8Array(buf);
      }
    } catch {
      // If arrayBuffer() can't be used for this body type, we omit the body and let the plugin send nothing.
      bodyUint8 = undefined;
    }
    console.log("Requesting url:", request.url, request);
    // Build options for the Tauri plugin
    // const tauriOpts: Request = {
    //   url: request.url,
    //   method: request.method,
    //   headers,
    //   // pass binary body if we have one (Tauri accepts Uint8Array/ArrayBuffer)
    //   body: bodyUint8,
    //   // request a binary response so we can construct a proper Response
    //   // responseType: "",
    // };

    // Race the tauri fetch against AbortSignal if present
    const signal = init?.signal ?? request.signal ?? undefined;

    const tauriPromise = http.fetch(request);

    if (!signal) {
      // No signal: just await the tauri fetch
      const tauriRes = await tauriPromise;
      return tauriResponseToFetchResponse(tauriRes);
    }

    // If signal is present, create a race so aborts cause an immediate rejection
    if (signal.aborted) {
      throw makeAbortError();
    }

    return await new Promise<Response>((resolve, reject) => {
      const onAbort = () => {
        cleanup();
        reject(makeAbortError());
      };
      const cleanup = () => {
        try {
          signal.removeEventListener("abort", onAbort);
        } catch {
          // ignore
        }
      };

      signal.addEventListener("abort", onAbort);

      tauriPromise
        .then((tauriRes) => {
          cleanup();
          resolve(tauriResponseToFetchResponse(tauriRes));
        })
        .catch((err) => {
          cleanup();
          reject(err);
        });
    });
  };
}

/** Convert the object returned by @tauri-apps/plugin-http to a standard Fetch Response. */
function tauriResponseToFetchResponse(tauriRes: Response): Response {
  return tauriRes;
  // const status = tauriRes.status ?? 0;

  // // Normalize headers to HeadersInit
  // let hdrs: HeadersInit = {};
  // if (Array.isArray(tauriRes.headers)) {
  //   // plugin may return [[k,v], ...]
  //   const h = new Headers();
  //   for (const [k, v] of tauriRes.headers as [string, string][]) {
  //     h.append(k, v);
  //   }
  //   hdrs = h;
  // } else if (tauriRes.headers && typeof tauriRes.headers === "object") {
  //   hdrs = tauriRes.headers as Record<string, string>;
  // }

  // // Convert data into a BodyInit acceptable by Response:
  // // - If the plugin returned a string, pass as-is (text)
  // // - If it returned a Uint8Array / ArrayBuffer-like, use that buffer
  // let body: BodyInit | null = null;
  // const data = tauriRes.data;
  // if (typeof data === "string") {
  //   body = data;
  // } else if (data instanceof Uint8Array) {
  //   body = data.buffer;
  // } else if (
  //   data &&
  //   typeof data === "object" &&
  //   "buffer" in data &&
  //   data.buffer instanceof ArrayBuffer
  // ) {
  //   // e.g. Node/Edge style typed array-like
  //   body = (data as any).buffer as ArrayBuffer;
  // } else if (data instanceof ArrayBuffer) {
  //   body = data;
  // } else if (data == null) {
  //   body = null;
  // } else {
  //   // fallback: stringify unknown data
  //   try {
  //     body = JSON.stringify(data);
  //     // ensure content-type header if not set
  //     if (hdrs && typeof hdrs === "object") {
  //       const hasContentType =
  //         hdrs instanceof Headers
  //           ? hdrs.has("content-type")
  //           : Object.keys(hdrs).some((k) => k.toLowerCase() === "content-type");
  //       if (!hasContentType) {
  //         if (hdrs instanceof Headers) {
  //           hdrs.set("content-type", "application/json; charset=utf-8");
  //         } else {
  //           (hdrs as Record<string, string>)["content-type"] =
  //             "application/json; charset=utf-8";
  //         }
  //       }
  //     }
  //   } catch {
  //     body = null;
  //   }
  // }

  // return new Response(body, {
  //   status,
  //   headers: hdrs,
  // });
}
