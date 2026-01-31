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

import type { Fetcher } from "@openrouter/sdk";
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
function _headersToRecord(headers: Headers): Record<string, string> {
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
	return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		// Build a Request object so we can use the Web Fetch Request helpers
		const request = input instanceof Request ? input : new Request(input as RequestInfo, init);

		// Race the tauri fetch against AbortSignal if present
		const signal = init?.signal ?? request.signal ?? undefined;

		const clonedRequest = request.clone();

		const tauriPromise = http.fetch(clonedRequest);

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
}
