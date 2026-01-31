import { surrealdbWasmEngines } from "@surrealdb/wasm";
import { useMutation } from "@tanstack/react-query";
import type React from "react";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { type LiveHandler, Surreal, type Uuid } from "surrealdb";

export function useResetDatabase() {
	const surreal = useSurreal();
	return async () => {
		await surreal.delete("info");
		await surreal.delete("profile");
		await surreal.delete("history");
		await surreal.delete("hypno");
		localStorage.clear();
		window.location.reload();
	};
}

export type UseLiveQueryProps<T extends Record<string, unknown> = Record<string, unknown>> = {
	query: string;
	callback: LiveHandler<T>;
	enabled?: boolean;
	params?: Record<string, unknown>;
	fetchInitial?: boolean; // New option
};

export type UseLiveQueryResult<T> = {
	data: T[] | undefined;
	isLoading: boolean;
	error: Error | undefined;
	queryUuid: Uuid | undefined;
};

export const useLiveQuery = <T extends Record<string, unknown>>({
	query,
	params,
	callback,
	enabled = true,
	fetchInitial = false,
}: UseLiveQueryProps<T>): UseLiveQueryResult<T> => {
	const dbClient = useSurreal();
	const [queryUuid, setQueryUuid] = useState<Uuid | undefined>();
	const [data, setData] = useState<T[] | undefined>();
	const [isLoading, setIsLoading] = useState(fetchInitial);
	const [error, setError] = useState<Error | undefined>();
	const callbackRef = useRef(callback);

	// Keep callback ref up to date
	useEffect(() => {
		callbackRef.current = callback;
	}, [callback]);

	// Create and manage live query
	useEffect(() => {
		if (!enabled || !query) return;

		let uuid: Uuid | undefined;
		let isSubscribed = true;

		const setupLiveQuery = async () => {
			try {
				setIsLoading(true);
				setError(undefined);

				// Step 1: Create live query first (so we don't miss updates)
				const liveResponse = await dbClient.query<[Uuid]>(`LIVE ${query}`, params);
				uuid = liveResponse[0];

				if (!isSubscribed) {
					await dbClient.kill(uuid);
					return;
				}

				setQueryUuid(uuid);

				// Step 2: Fetch initial data if requested
				if (fetchInitial) {
					const initialResponse = await dbClient.query<[T[]]>(query, params);
					if (isSubscribed) {
						setData(initialResponse[0]);
					}
				}

				// Step 3: Subscribe to live updates
				await dbClient.subscribeLive(uuid, callbackRef.current);

				setIsLoading(false);
			} catch (err) {
				const error = err instanceof Error ? err : new Error("Failed to create live query");
				setError(error);
				setIsLoading(false);
				console.error("Live query error:", error);
			}
		};

		const cleanup = async () => {
			if (uuid) {
				try {
					await dbClient.kill(uuid);
				} catch (error) {
					console.error("Failed to kill live query:", error);
				}
			}
		};

		const handleBeforeUnload = () => {
			cleanup();
		};

		window.addEventListener("beforeunload", handleBeforeUnload);
		setupLiveQuery();

		return () => {
			isSubscribed = false;
			cleanup();
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [query, enabled, fetchInitial, dbClient, params]);

	return { data, isLoading, error, queryUuid };
};

interface SurrealProviderProps {
	children: React.ReactNode;
	/** The database endpoint URL */
	endpoint: string;
	/** Optional existing Surreal client */
	client?: Surreal;
	/* Optional connection parameters */
	params?: Parameters<Surreal["connect"]>[1];
	/** Auto connect on component mount, defaults to true */
	autoConnect?: boolean;
}

interface SurrealProviderState {
	/** The Surreal instance */
	client: Surreal;
	/** Whether the connection is pending */
	isConnecting: boolean;
	/** Whether the connection was successfully established */
	isSuccess: boolean;
	/** Whether the connection rejected in an error */
	isError: boolean;
	/** The connection error, if present */
	error: unknown;
	/** Connect to the Surreal instance */
	connect: () => Promise<true>;
	/** Close the Surreal instance */
	close: () => Promise<true>;
}

const SurrealContext = createContext<SurrealProviderState | undefined>(undefined);

export function SurrealProvider({
	children,
	client,
	endpoint,
	params,
	autoConnect = true,
}: SurrealProviderProps) {
	// Surreal instance remains stable across re-renders
	const [surrealInstance] = useState(
		() =>
			client ??
			new Surreal({
				engines: surrealdbWasmEngines(),
			})
	);

	// React Query mutation for connecting to Surreal
	const {
		mutateAsync: connectMutation,
		isPending,
		isSuccess,
		isError,
		error,
		reset,
	} = useMutation({
		mutationFn: () => surrealInstance.connect(endpoint, params),
	});

	// Wrap mutateAsync in a stable callback
	const connect = useCallback(() => connectMutation(), [connectMutation]);

	// Wrap close() in a stable callback
	const close = useCallback(() => surrealInstance.close(), [surrealInstance]);

	// Auto-connect on mount (if enabled) and cleanup on unmount
	useEffect(() => {
		if (autoConnect) {
			connect();
		}

		return () => {
			reset();
			surrealInstance.close();
		};
	}, [autoConnect, connect, reset, surrealInstance]);

	// Memoize the context value
	const value: SurrealProviderState = useMemo(
		() => ({
			client: surrealInstance,
			isConnecting: isPending,
			isSuccess,
			isError,
			error,
			connect,
			close,
		}),
		[surrealInstance, isPending, isSuccess, isError, error, connect, close]
	);

	if (value.isConnecting) {
		return <div>Connecting to database...</div>;
	}
	if (value.isError) {
		return <div>Error connecting to database: {String(value.error)}</div>;
	}

	if (!value.isSuccess) {
		return <div>Not connected to database.</div>;
	}

	return <SurrealContext.Provider value={value}>{children}</SurrealContext.Provider>;
}

/**
 * Access the Surreal from the context.
 */
export function useSurreal() {
	const context = useContext(SurrealContext);
	if (!context) {
		throw new Error("useSurreal must be used within a SurrealProvider");
	}
	return context.client;
}
