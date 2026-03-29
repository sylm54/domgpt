import { tool } from "@/lib/models";
import * as z from "zod";
import type { Surreal } from "surrealdb";
import { useSurreal } from "../surreal";

type GetSurrealCallback = () => Surreal;

/**
 * Query tool for executing SurrealDB SELECT statements
 */
export const useQueryDatabaseTool = () => {
	const surreal = useSurreal();
	return tool({
		name: "queryDatabase",
		description: `Query the database using SurrealDB SQL syntax for efficient data retrieval. Supports SELECT queries only.

## Available Tables

### history
Contains user activity history with three types of sessions (ordered by time DESC):
- HypnoSession (type: "session_hypno"): time, extra?, debrief[]
- ChallengeSession (type: "challenge_session"): time, user_report
- ReflectionSession (type: "reflection_session"): time, report, chat[]

### challenges
User challenges with completion tracking:
- id, title, content, completed, completed_at, created_at

### todo_completion
Todo completion tracking:
- todo_id, date (ISO date string)

### hypno
Hypnotherapy files:
- id, name, content, created_at, updated_at

### subliminal
Subliminal audio files:
- id, name, content, created_at, updated_at

## SurrealDB Query Syntax

Basic Syntax:
\`\`\`sql
SELECT @fields FROM @target
  [WHERE @conditions]
  [GROUP BY @field]
  [ORDER BY @field ASC|DESC]
  [LIMIT @n]
  [START @offset]
\`\`\`

## Common Query Examples

### Get recent history
\`\`\`sql
SELECT * FROM history ORDER BY time DESC LIMIT 10
\`\`\`

### Filter by type
\`\`\`sql
SELECT * FROM history WHERE type = 'session_hypno' ORDER BY time DESC
\`\`\`

### Time range queries
\`\`\`sql
SELECT * FROM history
WHERE time >= d"2024-01-01T00:00:00Z" AND time < d"2024-02-01T00:00:00Z"
ORDER BY time DESC
\`\`\`

### Get last 30 days of activity
\`\`\`sql
SELECT * FROM history
WHERE time >= time::now() - 30d
ORDER BY time DESC
\`\`\`

### Get specific fields
\`\`\`sql
SELECT time, type, extra FROM history
WHERE type = 'session_hypno'
ORDER BY time DESC
\`\`\`

### Active challenges
\`\`\`sql
SELECT * FROM challenges WHERE completed = false
ORDER BY created_at ASC
\`\`\`

### Todo completions today
\`\`\`sql
SELECT * FROM todo_completion WHERE date = <string::lower(time::format(time::now(), "%Y-%m-%d"))>
\`\`\`

### Latest hypno files
\`\`\`sql
SELECT * FROM hypno ORDER BY created_at DESC LIMIT 10
\`\`\`

### Latest subliminal files
\`\`\`sql
SELECT * FROM subliminal ORDER BY created_at DESC LIMIT 10
\`\`\`

### Aggregations
\`\`\`sql
SELECT count() AS total, type
FROM history
GROUP BY type
\`\`\`

## Notes
- SurrealDB uses ISO datetime strings: d"2024-01-01T00:00:00Z"
- Use time::now() for current timestamp
- Duration math: time::now() - 30d (30 days ago)
- All SELECT queries return arrays of JSON-like objects
`,
		schema: {
			query: z.string(),
		},
		call: async ({ query }) => {
			try {
				// Security: Only allow SELECT queries
				const trimmedQuery = query.trim();
				if (!trimmedQuery.toUpperCase().startsWith("SELECT")) {
					return {
						error: "Security: Only SELECT queries are allowed. Query must start with SELECT.",
					};
				}

				// Additional security: Block dangerous keywords
				const dangerousKeywords = [
					"DELETE",
					"DROP",
					"UPDATE",
					"INSERT",
					"CREATE",
					"ALTER",
					"GRANT",
					"REVOKE",
					"REMOVE",
					"RELATE",
					"DEFINE",
				];
				const upperQuery = trimmedQuery.toUpperCase();
				for (const keyword of dangerousKeywords) {
					if (upperQuery.includes(keyword)) {
						return {
							error: `Security: ${keyword} queries are not allowed. Use only SELECT queries.`,
						};
					}
				}

				// Execute query
				const result = await surreal.query(query);

				return {
					data: result,
					success: true,
				};
			} catch (error) {
				return {
					error: `Query failed: ${error instanceof Error ? error.message : String(error)}`,
					success: false,
				};
			}
		},
	});
};
