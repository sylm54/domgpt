import {
	createMemoryRouter,
	createRoutesFromElements,
	Outlet,
	Route,
	RouterProvider,
} from "react-router-dom";
import {
	ChallengesPage,
	CoachPage,
	Dashboard,
	HypnoNewPage,
	HypnoPlayPage,
	OnboardingPage,
	ReflectionPage,
} from "./pages";
import { SurrealProvider } from "./data/surreal";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";

// Layout component with navigation
function Layout() {
	return (
		<main className="h-screen flex flex-col overflow-hidden bg-background">
			<nav className="border-b px-4 py-2 flex items-center gap-4">
				<h1 className="font-bold text-lg">Conditioning Trainer</h1>
				<div className="flex-1" />
				<a href="/" className="text-sm text-muted-foreground hover:text-foreground">
					Dashboard
				</a>
				<a href="/hypno/new" className="text-sm text-muted-foreground hover:text-foreground">
					New Session
				</a>
				<a href="/coach" className="text-sm text-muted-foreground hover:text-foreground">
					Coach
				</a>
				<a href="/challenges" className="text-sm text-muted-foreground hover:text-foreground">
					Challenges
				</a>
				<a href="/reflection" className="text-sm text-muted-foreground hover:text-foreground">
					Reflect
				</a>
			</nav>
			<div className="flex-1 min-h-0 overflow-hidden">
				<Outlet />
			</div>
		</main>
	);
}

export const router = createMemoryRouter(
	createRoutesFromElements(
		<Route path="/" element={<Layout />}>
			<Route index element={<Dashboard />} />
			<Route path="onboarding" element={<OnboardingPage />} />
			<Route path="coach" element={<CoachPage />} />
			<Route path="challenges" element={<ChallengesPage />} />
			<Route path="reflection" element={<ReflectionPage />} />
			<Route path="hypno/new" element={<HypnoNewPage />} />
			<Route path="hypno/play/:sessionId" element={<HypnoPlayPage />} />
		</Route>
	),
	{
		initialEntries: ["/"],
	}
);
const queryClient = new QueryClient();
function App() {
	return (
		<main className="h-screen flex flex-col overflow-hidden">
			<div className="flex-1 min-h-0 overflow-hidden">
				<QueryClientProvider client={queryClient}>
					<SurrealProvider
						endpoint="indxdb://demo"
						params={{ namespace: "app", database: "default" }}
					>
						<RouterProvider router={router} />
					</SurrealProvider>
				</QueryClientProvider>
			</div>
		</main>
	);
}

export default App;
