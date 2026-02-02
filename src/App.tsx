import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
	createMemoryRouter,
	createRoutesFromElements,
	Outlet,
	Route,
	RouterProvider,
} from "react-router-dom";
import { SurrealProvider } from "./data/surreal";
import {
	ChallengesPage,
	CoachPage,
	Dashboard,
	HypnoNewPage,
	HypnoPlayPage,
	OnboardingPage,
	ReflectionPage,
	SettingsPage,
} from "./pages";

// Layout component
function Layout() {
	return (
		<main className="h-screen flex flex-col overflow-hidden bg-background relative">
			{/* Decorative gradient orb */}
			<div
				className="absolute top-0 right-0 w-96 h-96 pointer-events-none"
				style={{
					background:
						"radial-gradient(circle at center, rgba(139, 92, 246, 0.08) 0%, transparent 70%)",
					transform: "translate(30%, -30%)",
				}}
			/>
			<div
				className="absolute bottom-0 left-0 w-80 h-80 pointer-events-none"
				style={{
					background:
						"radial-gradient(circle at center, rgba(59, 130, 246, 0.06) 0%, transparent 70%)",
					transform: "translate(-30%, 30%)",
				}}
			/>

			{/* Main content area */}
			<motion.div
				className="flex-1 min-h-0 overflow-hidden relative z-0"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.4 }}
			>
				<Outlet />
			</motion.div>
		</main>
	);
}

export const router = createMemoryRouter(
	createRoutesFromElements(
		<Route path="/" element={<Layout />}>
			<Route index element={<Dashboard />} />
			<Route path="onboarding" element={<OnboardingPage />} />
			<Route path="settings" element={<SettingsPage />} />
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
	console.log("Render");
	return (
		<main className="h-screen flex flex-col overflow-hidden">
			<div className="flex-1 min-h-0 overflow-hidden">
				<QueryClientProvider client={queryClient}>
					<SurrealProvider
						endpoint="indxdb://demo"
						params={{ namespace: "app", database: "default" }}
					>
						<Router />
					</SurrealProvider>
				</QueryClientProvider>
			</div>
		</main>
	);
}

function Router() {
	return <RouterProvider router={router} />;
}

export default App;
