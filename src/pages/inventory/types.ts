/**
 * Inventory type definitions and storage utilities
 */

import { logActivity } from "@/pages/activity";

/**
 * Additional data value type - only strings and numbers allowed
 */
export type AdditionalDataValue = string | number;

/**
 * Additional data map for inventory items
 */
export type AdditionalData = Record<string, AdditionalDataValue>;

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  image: string;
  tags: string[];
  additionalData: AdditionalData;
  createdAt: number;
}

export interface InventoryData {
  items: InventoryItem[];
}

export const INVENTORY_STORAGE_KEY = "self-improvement-inventory";

/**
 * Load inventory data from localStorage
 */
export function loadInventoryData(): InventoryData {
  try {
    const stored = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (!stored) {
      return {
        items: [],
      };
    }
    const data = JSON.parse(stored) as InventoryData;
    // Ensure all items have additionalData field (migration for existing data)
    data.items = data.items.map((item) => ({
      ...item,
      additionalData: item.additionalData ?? {},
    }));
    return data;
  } catch (error) {
    console.error("Failed to load inventory data:", error);
    return {
      items: [],
    };
  }
}

/**
 * Save inventory data to localStorage
 */
export function saveInventoryData(data: InventoryData): void {
  try {
    localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save inventory data:", error);
  }
}

/**
 * Add an item to the inventory
 */
export function addItem(
  data: InventoryData,
  name: string,
  description: string,
  image: string,
  tags: string[],
  additionalData: AdditionalData = {},
): InventoryData {
  const newItem: InventoryItem = {
    id: crypto.randomUUID(),
    name,
    description,
    image,
    tags,
    additionalData,
    createdAt: Date.now(),
  };
  logActivity(
    "inventory_item_added",
    `Added to inventory: ${name}`,
    tags.length > 0 ? `Tags: ${tags.join(", ")}` : undefined,
    { itemId: newItem.id, tags },
  );
  return {
    ...data,
    items: [...data.items, newItem],
  };
}

/**
 * Remove an item from the inventory
 */
export function removeItem(data: InventoryData, id: string): InventoryData {
  const item = data.items.find((i) => i.id === id);
  if (item) {
    logActivity(
      "inventory_item_removed",
      `Removed from inventory: ${item.name}`,
      undefined,
      { itemId: id },
    );
  }
  return {
    ...data,
    items: data.items.filter((item) => item.id !== id),
  };
}

/**
 * Update an item in the inventory
 */
export function updateItem(
  data: InventoryData,
  id: string,
  updates: Partial<Omit<InventoryItem, "id" | "createdAt">>,
): InventoryData {
  return {
    ...data,
    items: data.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    ),
  };
}

/**
 * Get all items
 */
export function getAllItems(data: InventoryData): InventoryItem[] {
  return data.items;
}

/**
 * Get all unique tags used across all items
 */
export function getAllTags(data: InventoryData): string[] {
  const tagSet = new Set<string>();
  for (const item of data.items) {
    for (const tag of item.tags) {
      tagSet.add(tag);
    }
  }
  return Array.from(tagSet).sort();
}

/**
 * Get all unique keys used in additionalData across all items
 */
export function getAllKeys(data: InventoryData): string[] {
  const keySet = new Set<string>();
  for (const item of data.items) {
    for (const key of Object.keys(item.additionalData)) {
      keySet.add(key);
    }
  }
  return Array.from(keySet).sort();
}

/**
 * Search items by query (name, description, tags)
 */
export function searchItems(
  data: InventoryData,
  query: string,
): InventoryItem[] {
  const lowerQuery = query.toLowerCase();
  return data.items.filter(
    (item) =>
      item.name.toLowerCase().includes(lowerQuery) ||
      item.description.toLowerCase().includes(lowerQuery) ||
      item.tags.some((tag) => tag.toLowerCase().includes(lowerQuery)),
  );
}

/**
 * Parse and evaluate a filter expression against an item's additionalData
 * Supports: >, <, >=, <=, ==, != operators
 * Example: 'length>14&&foo=="bar"'
 */
export function evaluateFilter(item: InventoryItem, filter: string): boolean {
  if (!filter || filter.trim() === "") return true;

  try {
    // Split by && and || while preserving them
    const conditions = filter.split(/(\&\&|\|\|)/);

    let result = true;
    let currentOperator = "&&";

    for (const part of conditions) {
      const trimmedPart = part.trim();

      if (trimmedPart === "&&") {
        currentOperator = "&&";
        continue;
      }
      if (trimmedPart === "||") {
        currentOperator = "||";
        continue;
      }
      if (trimmedPart === "") continue;

      const conditionResult = evaluateSingleCondition(item, trimmedPart);

      if (currentOperator === "&&") {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }
    }

    return result;
  } catch (error) {
    console.error("Failed to evaluate filter:", filter, error);
    return false;
  }
}

/**
 * Evaluate a single condition like 'length>14' or 'foo=="bar"'
 */
function evaluateSingleCondition(
  item: InventoryItem,
  condition: string,
): boolean {
  // Match pattern: key operator value
  const match = condition.match(/^(\w+)\s*(>=|<=|!=|==|>|<)\s*(.+)$/);
  if (!match) return false;

  const [, key, operator, rawValue] = match;
  const itemValue = item.additionalData[key];

  // If the key doesn't exist in additionalData, condition fails
  if (itemValue === undefined) return false;

  // Parse the comparison value
  let compareValue: string | number;
  const trimmedValue = rawValue.trim();

  // Check if it's a quoted string
  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    compareValue = trimmedValue.slice(1, -1);
  } else {
    // Try to parse as number
    const numValue = parseFloat(trimmedValue);
    compareValue = Number.isNaN(numValue) ? trimmedValue : numValue;
  }

  // Perform comparison
  switch (operator) {
    case "==":
      return itemValue === compareValue;
    case "!=":
      return itemValue !== compareValue;
    case ">":
      return (
        typeof itemValue === "number" &&
        typeof compareValue === "number" &&
        itemValue > compareValue
      );
    case "<":
      return (
        typeof itemValue === "number" &&
        typeof compareValue === "number" &&
        itemValue < compareValue
      );
    case ">=":
      return (
        typeof itemValue === "number" &&
        typeof compareValue === "number" &&
        itemValue >= compareValue
      );
    case "<=":
      return (
        typeof itemValue === "number" &&
        typeof compareValue === "number" &&
        itemValue <= compareValue
      );
    default:
      return false;
  }
}

/**
 * Filter items by tags (item must have all specified tags)
 */
export function filterByTags(
  items: InventoryItem[],
  tags: string[],
): InventoryItem[] {
  if (!tags || tags.length === 0) return items;
  return items.filter((item) =>
    tags.every((tag) =>
      item.tags.some((t) => t.toLowerCase() === tag.toLowerCase()),
    ),
  );
}

/**
 * Advanced search with tag filtering and additionalData filter expressions
 */
export function advancedSearchItems(
  data: InventoryData,
  options: {
    query?: string;
    tags?: string[];
    filter?: string;
  },
): InventoryItem[] {
  let results = data.items;

  // Filter by search query
  if (options.query && options.query.trim() !== "") {
    results = searchItems({ items: results }, options.query);
  }

  // Filter by tags
  if (options.tags && options.tags.length > 0) {
    results = filterByTags(results, options.tags);
  }

  // Filter by additionalData expression
  if (options.filter && options.filter.trim() !== "") {
    const filterExpr = options.filter;
    results = results.filter((item) => evaluateFilter(item, filterExpr));
  }

  return results;
}
