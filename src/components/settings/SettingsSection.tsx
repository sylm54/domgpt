import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface SettingsSectionProps {
	children: ReactNode;
	title: string;
	description?: string;
}

export function SettingsSection({ children, title, description }: SettingsSectionProps) {
	return (
		<Card className="border-2 border-primary/10 overflow-hidden bg-background/95 backdrop-blur-sm">
			<CardHeader className="pb-4">
				<CardTitle className="text-xl">{title}</CardTitle>
				{description && <CardDescription>{description}</CardDescription>}
			</CardHeader>
			<CardContent className="pt-0">{children}</CardContent>
		</Card>
	);
}
