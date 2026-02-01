import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
	createMemoryRouter,
	createRoutesFromElements,
	Outlet,
	Route,
	RouterProvider,
	useLocation,
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
} from "./pages";

// Navigation link component with pill-shaped hover/active states
function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
	const location = useLocation();
	const isActive = href === "/" ? location.pathname === "/" : location.pathname.startsWith(href);

	return (
		<motion.a
			href={href}
			className={`
				relative px-4 py-1.5 text-sm font-medium rounded-full
				transition-all duration-300 ease-out
				${
					isActive
						? "text-primary bg-primary/10"
						: "text-muted-foreground hover:text-primary hover:bg-primary/5"
				}
			`}
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
		>
			{children}
			{isActive && (
				<motion.div
					layoutId="nav-pill"
					className="absolute inset-0 rounded-full bg-primary/10 -z-10"
					initial={false}
					transition={{ type: "spring", stiffness: 500, damping: 35 }}
				/>
			)}
		</motion.a>
	);
}

// Layout component with navigation
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

			{/* Frosted glass navigation */}
			<motion.nav
				className="relative z-10 px-6 py-3 flex items-center gap-2 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl"
				initial={{ y: -20, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ duration: 0.4, ease: "easeOut" }}
			>
				{/* Gradient bottom border */}
				<div
					className="absolute bottom-0 left-0 right-0 h-px"
					style={{
						background:
							"linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3) 20%, rgba(59, 130, 246, 0.3) 80%, transparent)",
					}}
				/>

				{/* Logo/Title with gradient */}
				<motion.h1
					className="font-bold text-xl tracking-tight bg-gradient-to-r from-violet-600 via-purple-600 to-blue-600 bg-clip-text text-transparent"
					initial={{ opacity: 0, x: -10 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.1 }}
				>
					Conditioning Trainer
				</motion.h1>

				<div className="flex-1" />

				{/* Navigation links */}
				<motion.div
					className="flex items-center gap-1"
					initial={{ opacity: 0, x: 10 }}
					animate={{ opacity: 1, x: 0 }}
					transition={{ duration: 0.5, delay: 0.2 }}
				>
					<NavLink href="/">Dashboard</NavLink>
					<NavLink href="/hypno/new">New Session</NavLink>
					<NavLink href="/coach">Coach</NavLink>
					<NavLink href="/challenges">Challenges</NavLink>
					<NavLink href="/reflection">Reflect</NavLink>
				</motion.div>
			</motion.nav>

			{/* Main content area */}
			<motion.div
				className="flex-1 min-h-0 overflow-hidden relative z-0"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.4, delay: 0.3 }}
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
