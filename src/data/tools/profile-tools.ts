import { tool } from "@/lib/models";
import { useProfileStore } from "@/data/profile";
import { UserDataSchema } from "@/types/user";
import * as z from "zod";
import * as jmespath from "jmespath";
import * as fastJsonPatch from "fast-json-patch";

/**
 * Validation schema for write operations that excludes derived [READ ONLY] fields
 */
const UserDataWriteSchema = UserDataSchema.pick({
	profile: true,
	goal: true,
	todos: true,
	plan: true,
	milestones: true,
});

/**
 * Read tool for querying the profile using JMESPath
 */
export const useProfileReadTool = () => {
	return tool({
		name: "readProfile",
		description: "Query the user profile using JMESPath to retrieve specific data",
		schema: {
			query: z.string(),
		},
		call: async ({ query }) => {
			const profile = useProfileStore.getState().getProfile();

			if (!profile) {
				return { error: "No profile exists. Please create a profile first." };
			}

			try {
				const result = jmespath.search(profile.data, query);
				return { data: result };
			} catch (error) {
				return {
					error: `JMESPath query failed: ${error instanceof Error ? error.message : String(error)}`,
				};
			}
		},
	});
};

/**
 * JSON Patch Operation type
 */
const JsonPatchOperationSchema = z.object({
	op: z.enum(["add", "remove", "replace", "move", "copy", "test"]),
	path: z.string(),
	value: z.any().optional(),
	from: z.string().optional(),
});

/**
 * Write tool for updating the profile using JSON Patch with zod validation
 */
export const useProfileWriteTool = () => {
	return tool({
		name: "writeProfile",
		description:
			"Update the user profile by applying a JSON Patch (RFC 6902). The operation validates against the UserDataSchema before persisting.",
		schema: {
			patch: z.array(JsonPatchOperationSchema),
		},
		call: async ({ patch }) => {
			const profile = useProfileStore.getState().getProfile();

			if (!profile) {
				return { error: "No profile exists. Please create a profile first." };
			}

			try {
				// Apply the patch to a copy of the profile data
				const patchedData = JSON.parse(JSON.stringify(profile.data));
				fastJsonPatch.applyPatch(patchedData, patch as fastJsonPatch.Operation[]);

				// Validate the patched data against the write schema (excludes derived [READ ONLY] fields)
				const validationResult = UserDataWriteSchema.safeParse(patchedData);

				if (!validationResult.success) {
					const errorDetails = validationResult.error.issues
						.map((err) => `Path: ${err.path.join(".")}, Message: ${err.message}`)
						.join("; ");

					return {
						error: `Validation failed after applying patch. Changes were not saved. Errors: ${errorDetails}`,
						details: validationResult.error.issues,
					};
				}

				// Merge validated data with existing profile to preserve derived fields
				useProfileStore.getState().setProfile({
					...profile,
					data: {
						...validationResult.data,
						// Preserve derived [READ ONLY] fields
						currentMilestone: profile.data.currentMilestone,
						currentResourceTags: profile.data.currentResourceTags,
					},
					updated_at: new Date(),
				});

				return { success: true, message: "Profile updated successfully" };
			} catch (error) {
				if (error instanceof fastJsonPatch.JsonPatchError) {
					return {
						error: `JSON Patch operation failed: ${error.message}`,
						name: error.name,
						index: error.index,
					};
				}
				return {
					error: `Failed to update profile: ${error instanceof Error ? error.message : String(error)}`,
				};
			}
		},
	});
};

/**
 * Generate an agent-readable description of the zod schema
 */
export const useDefinition = (): string => {
	const generateZodDescription = (schema: z.ZodType, indent = 0): string => {
		const prefix = " ".repeat(indent);
		const typeName = schema.constructor.name;

		try {
			if (typeName === "ZodObject") {
				const objSchema = schema as z.ZodObject<z.ZodRawShape>;
				const shape = objSchema.shape;
				const descriptions: string[] = [];

				for (const [key, value] of Object.entries(shape)) {
					const innerSchema = value as z.ZodType;
					const innerTypeName = innerSchema.constructor.name;

					// Check if the field is optional
					const isOptional = innerTypeName === "ZodOptional";
					const actualSchema = isOptional
						? (innerSchema as z.ZodOptional<z.ZodType>).unwrap()
						: innerSchema;

					const fieldDesc = generateZodDescription(actualSchema, indent + 2);
					const optional = isOptional ? " (optional)" : "";

					descriptions.push(`${prefix}${key}: ${fieldDesc}${optional}`);
				}

				return `{\n${descriptions.join("\n")}\n${prefix}}`;
			}

			if (typeName === "ZodArray") {
				const arrSchema = schema as z.ZodArray<z.ZodType>;
				const elementType = generateZodDescription(arrSchema.element, 0);
				return `Array<${elementType}>`;
			}

			if (typeName === "ZodString") {
				return "string";
			}

			if (typeName === "ZodNumber") {
				return "number";
			}

			if (typeName === "ZodBoolean") {
				return "boolean";
			}

			if (typeName === "ZodRecord") {
				const recSchema = schema as z.ZodRecord<z.ZodString, z.ZodType>;
				const valueType = generateZodDescription(recSchema.valueType, 0);
				return `Record<string, ${valueType}>`;
			}

			if (typeName === "ZodOptional") {
				const optSchema = schema as z.ZodOptional<z.ZodType>;
				return generateZodDescription(optSchema.unwrap(), 0) + " (optional)";
			}

			if (typeName === "ZodUnion" || typeName === "ZodDiscriminatedUnion") {
				// Access options dynamically to avoid strict typing issues
				const unionSchema = schema as unknown as { options: z.ZodType[] };
				const options = unionSchema.options.map((opt) => generateZodDescription(opt, 0));
				return options.join(" | ");
			}

			if (typeName === "ZodLiteral") {
				const litSchema = schema as unknown as { value: unknown };
				return JSON.stringify(litSchema.value);
			}

			if (typeName === "ZodEnum") {
				const enumSchema = schema as unknown as { options: string[] };
				return enumSchema.options.map((o) => `"${o}"`).join(" | ");
			}

			// Skip ZodEffects and similar wrapper types
			if (typeName === "ZodEffects" || typeName === "ZodTransform" || typeName === "ZodRefine") {
				// Access inner schema through _def property
				const wrapperSchema = schema as unknown as { _def: { schema: z.ZodType } };
				return generateZodDescription(wrapperSchema._def.schema, indent);
			}

			return "unknown";
		} catch {
			return "complex type";
		}
	};

	const schemaDescription = generateZodDescription(UserDataSchema);

	return `## User Profile Data Schema:

${schemaDescription}

Notes:
- All fields are required unless marked as (optional)
- Fields marked [READ ONLY] are derived and cannot be modified directly
- Use the read_profile tool with JMESPath queries to access nested data
- When using JMESPath don't query for multiple fields by separating by commas, instead use multiple queries or query for the parent object
- Try to be specific with JMESPath queries to avoid retrieving too much data you can do followup queries to drill down into specific fields as needed
- Use the write_profile tool with JSON Patch operations to modify data
- JSON Patch supports operations: add, remove, replace, move, copy, test
- Example JMESPath queries:
  - "profile.environment" - Get environment setting
  - "profile.habits[*]" - Get all habits
  - "todos" - Get all todos

- Example JSON Patch operations:
  - [{"op": "add", "path": "/profile/habits/-", "value": "new habit"}]
  - [{"op": "replace", "path": "/goal/description", "value": "updated goal"}]
  - [{"op": "remove", "path": "/profile/weaknesses/0"}]`;
};

/**
 * Export all profile tools
 */
export const useProfileTools = () => {
	return [useProfileReadTool(), useProfileWriteTool()];
};
