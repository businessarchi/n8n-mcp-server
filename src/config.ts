/**
 * Configuration management for N8N instances
 *
 * Instances can be configured via environment variables:
 * - N8N_INSTANCES: JSON string with array of instances
 *
 * Example:
 * N8N_INSTANCES='[{"name":"prod","url":"https://n8n.example.com","apiKey":"xxx"}]'
 *
 * Or individual instances:
 * - N8N_INSTANCE_1_NAME=prod
 * - N8N_INSTANCE_1_URL=https://n8n.example.com
 * - N8N_INSTANCE_1_API_KEY=xxx
 */

import type { N8NInstance } from './types.js';

export function loadInstances(): N8NInstance[] {
  const instances: N8NInstance[] = [];

  // Try loading from N8N_INSTANCES JSON
  const instancesJson = process.env.N8N_INSTANCES;
  if (instancesJson) {
    try {
      const parsed = JSON.parse(instancesJson);
      if (Array.isArray(parsed)) {
        for (const inst of parsed) {
          if (inst.name && inst.url && inst.apiKey) {
            instances.push({
              name: inst.name,
              url: inst.url.replace(/\/$/, ''), // Remove trailing slash
              apiKey: inst.apiKey,
            });
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse N8N_INSTANCES JSON:', e);
    }
  }

  // Try loading individual instances (N8N_INSTANCE_1_*, N8N_INSTANCE_2_*, etc.)
  for (let i = 1; i <= 20; i++) {
    const name = process.env[`N8N_INSTANCE_${i}_NAME`];
    const url = process.env[`N8N_INSTANCE_${i}_URL`];
    const apiKey = process.env[`N8N_INSTANCE_${i}_API_KEY`];

    if (name && url && apiKey) {
      instances.push({
        name,
        url: url.replace(/\/$/, ''),
        apiKey,
      });
    }
  }

  // Fallback: try simple N8N_URL and N8N_API_KEY for single instance
  if (instances.length === 0) {
    const url = process.env.N8N_URL;
    const apiKey = process.env.N8N_API_KEY;
    const name = process.env.N8N_INSTANCE_NAME || 'default';

    if (url && apiKey) {
      instances.push({
        name,
        url: url.replace(/\/$/, ''),
        apiKey,
      });
    }
  }

  return instances;
}

export function getInstanceByName(instances: N8NInstance[], name: string): N8NInstance | undefined {
  return instances.find(
    (inst) => inst.name.toLowerCase() === name.toLowerCase()
  );
}

export function validateInstances(instances: N8NInstance[]): void {
  if (instances.length === 0) {
    console.warn(
      'No N8N instances configured. Set N8N_INSTANCES or N8N_URL/N8N_API_KEY environment variables.'
    );
  }

  // Check for duplicate names
  const names = new Set<string>();
  for (const inst of instances) {
    const lowerName = inst.name.toLowerCase();
    if (names.has(lowerName)) {
      console.warn(`Duplicate instance name: ${inst.name}`);
    }
    names.add(lowerName);
  }
}
