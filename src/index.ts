#!/usr/bin/env node
/**
 * N8N MCP Server
 * A Model Context Protocol server for managing multiple N8N instances
 *
 * Features:
 * - Manage multiple N8N instances
 * - List, search, create, update, delete workflows
 * - Activate/deactivate workflows
 * - Execute workflows and track executions
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadInstances, validateInstances } from './config.js';
import {
  toolDefinitions,
  N8NToolHandlers,
  ListInstancesSchema,
  ListWorkflowsSchema,
  SearchWorkflowsSchema,
  GetWorkflowSchema,
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  DeleteWorkflowSchema,
  ToggleWorkflowSchema,
  ExecuteWorkflowSchema,
  ListExecutionsSchema,
  GetExecutionSchema,
} from './tools.js';

// Load and validate instances
const instances = loadInstances();
validateInstances(instances);

// Create tool handlers
const handlers = new N8NToolHandlers(instances);

// Create MCP server
const server = new Server(
  {
    name: 'n8n-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: toolDefinitions,
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: string;

    switch (name) {
      case 'n8n_list_instances':
        ListInstancesSchema.parse(args);
        result = await handlers.listInstances();
        break;

      case 'n8n_list_workflows':
        result = await handlers.listWorkflows(ListWorkflowsSchema.parse(args));
        break;

      case 'n8n_search_workflows':
        result = await handlers.searchWorkflows(SearchWorkflowsSchema.parse(args));
        break;

      case 'n8n_get_workflow':
        result = await handlers.getWorkflow(GetWorkflowSchema.parse(args));
        break;

      case 'n8n_create_workflow':
        result = await handlers.createWorkflow(CreateWorkflowSchema.parse(args));
        break;

      case 'n8n_update_workflow':
        result = await handlers.updateWorkflow(UpdateWorkflowSchema.parse(args));
        break;

      case 'n8n_delete_workflow':
        result = await handlers.deleteWorkflow(DeleteWorkflowSchema.parse(args));
        break;

      case 'n8n_toggle_workflow':
        result = await handlers.toggleWorkflow(ToggleWorkflowSchema.parse(args));
        break;

      case 'n8n_execute_workflow':
        result = await handlers.executeWorkflow(ExecuteWorkflowSchema.parse(args));
        break;

      case 'n8n_list_executions':
        result = await handlers.listExecutions(ListExecutionsSchema.parse(args));
        break;

      case 'n8n_get_execution':
        result = await handlers.getExecution(GetExecutionSchema.parse(args));
        break;

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: errorMessage }, null, 2),
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('N8N MCP Server running on stdio');
  console.error(`Loaded ${instances.length} N8N instance(s)`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
