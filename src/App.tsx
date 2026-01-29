import {
	createMemoryRouter,
	createRoutesFromElements,
	Route,
	RouterProvider,
} from "react-router-dom";

export const router = createMemoryRouter(
	createRoutesFromElements(<Route path="/"></Route>),
	{
		initialEntries: ["/"],
	},
);

function App() {
	return (
		<main className="h-screen flex flex-col overflow-hidden">
			<div className="flex-1 min-h-0 overflow-hidden">
				<RouterProvider router={router} />
			</div>
		</main>
	);
}

export default App;
