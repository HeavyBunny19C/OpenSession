// src/providers/index.mjs
import opencode from "./opencode/adapter.mjs";
import claudeCode from "./claude-code/adapter.mjs";
import codex from "./codex/adapter.mjs";

/** @type {import('./interface.mjs').ProviderAdapter[]} */
const ALL_PROVIDERS = [];

/**
 * Register a provider adapter.
 * @param {import('./interface.mjs').ProviderAdapter} adapter
 */
export function registerProvider(adapter) {
  ALL_PROVIDERS.push(adapter);
}

/**
 * Get all providers whose data directory exists on this machine.
 * @returns {import('./interface.mjs').ProviderAdapter[]}
 */
export function getAvailableProviders() {
  return ALL_PROVIDERS.filter((p) => p.detect());
}

/**
 * Get a specific provider by ID.
 * @param {string} id
 * @returns {import('./interface.mjs').ProviderAdapter|null}
 */
export function getProvider(id) {
  return ALL_PROVIDERS.find((p) => p.id === id) || null;
}

/**
 * Get all registered providers (regardless of detection).
 * @returns {import('./interface.mjs').ProviderAdapter[]}
 */
export function getAllProviders() {
  return [...ALL_PROVIDERS];
}

// --- Provider registration (MUST be after ALL_PROVIDERS declaration) ---
registerProvider(opencode);
registerProvider(claudeCode);
registerProvider(codex);
