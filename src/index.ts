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
 *
 * Supports both stdio and SSE (HTTP) transports
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createServer, IncomingMessage, ServerResponse } from 'http';

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
function createMCPServer() {
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

  return server;
}

// Start stdio server
async function startStdioServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('N8N MCP Server running on stdio');
  console.error(`Loaded ${instances.length} N8N instance(s)`);
}

// Start SSE (HTTP) server
async function startSSEServer() {
  const port = parseInt(process.env.PORT || '3000', 10);

  // Store active transports for cleanup
  const activeTransports = new Map<string, SSEServerTransport>();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://localhost:${port}`);

    // Health check endpoint
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        instances: instances.length,
        transport: 'sse',
      }));
      return;
    }

    // SSE endpoint - client connects here to receive messages
    if (url.pathname === '/sse' && req.method === 'GET') {
      console.error('New SSE connection');
      const server = createMCPServer();
      const transport = new SSEServerTransport('/messages', res);

      // Store transport with session ID
      const sessionId = Date.now().toString();
      activeTransports.set(sessionId, transport);

      // Clean up on disconnect
      res.on('close', () => {
        console.error('SSE connection closed');
        activeTransports.delete(sessionId);
      });

      await server.connect(transport);
      return;
    }

    // Messages endpoint - client sends messages here
    if (url.pathname === '/messages' && req.method === 'POST') {
      // Find the transport for this session
      const sessionId = url.searchParams.get('sessionId');

      if (sessionId && activeTransports.has(sessionId)) {
        const transport = activeTransports.get(sessionId)!;
        await transport.handlePostMessage(req, res);
      } else {
        // If no session ID, try to handle with any available transport
        // This is a fallback for simpler clients
        const transports = Array.from(activeTransports.values());
        if (transports.length > 0) {
          await transports[0].handlePostMessage(req, res);
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No active SSE connection' }));
        }
      }
      return;
    }

    // Root endpoint - info
    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'n8n-mcp-server',
        version: '1.0.0',
        transport: 'sse',
        endpoints: {
          sse: '/sse',
          messages: '/messages',
          health: '/health',
        },
        instances: instances.map(i => ({ name: i.name, url: i.url })),
      }));
      return;
    }

    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });

  httpServer.listen(port, () => {
    console.error(`N8N MCP Server running on http://0.0.0.0:${port}`);
    console.error(`SSE endpoint: http://0.0.0.0:${port}/sse`);
    console.error(`Loaded ${instances.length} N8N instance(s)`);
  });
}

// Main entry point
async function main() {
  const transport = process.env.MCP_TRANSPORT || 'sse';

  if (transport === 'stdio') {
    await startStdioServer();
  } else {
    await startSSEServer();
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
