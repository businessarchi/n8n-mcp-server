/**
 * MCP Tools definitions for N8N management
 * 11 tools for managing workflows and executions across multiple N8N instances
 */

import { z } from 'zod';
import type { N8NInstance } from './types.js';
import { N8NClient } from './n8n-client.js';
import { getInstanceByName } from './config.js';

// Tool schemas
export const ListInstancesSchema = z.object({});

export const ListWorkflowsSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  active: z.boolean().optional().describe('Filter by active status'),
  tags: z.string().optional().describe('Filter by tags (comma-separated)'),
  limit: z.number().optional().default(100).describe('Maximum number of workflows to return'),
});

export const SearchWorkflowsSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  query: z.string().describe('Search query to filter workflows by name'),
  active: z.boolean().optional().describe('Filter by active status'),
});

export const GetWorkflowSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  workflowId: z.string().describe('ID of the workflow'),
});

export const CreateWorkflowSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  name: z.string().describe('Name of the new workflow'),
  nodes: z.array(z.any()).optional().describe('Workflow nodes'),
  connections: z.record(z.any()).optional().describe('Node connections'),
  settings: z.record(z.any()).optional().describe('Workflow settings'),
  active: z.boolean().optional().default(false).describe('Whether to activate the workflow'),
});

export const UpdateWorkflowSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  workflowId: z.string().describe('ID of the workflow to update'),
  name: z.string().optional().describe('New name for the workflow'),
  nodes: z.array(z.any()).optional().describe('Updated workflow nodes'),
  connections: z.record(z.any()).optional().describe('Updated node connections'),
  settings: z.record(z.any()).optional().describe('Updated workflow settings'),
  active: z.boolean().optional().describe('Whether to activate/deactivate the workflow'),
});

export const DeleteWorkflowSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  workflowId: z.string().describe('ID of the workflow to delete'),
});

export const ToggleWorkflowSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  workflowId: z.string().describe('ID of the workflow'),
  active: z.boolean().describe('Whether to activate (true) or deactivate (false) the workflow'),
});

export const ExecuteWorkflowSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  workflowId: z.string().describe('ID of the workflow to execute'),
});

export const ListExecutionsSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  workflowId: z.string().optional().describe('Filter by workflow ID'),
  status: z
    .enum(['running', 'success', 'error', 'waiting', 'canceled'])
    .optional()
    .describe('Filter by execution status'),
  limit: z.number().optional().default(20).describe('Maximum number of executions to return'),
});

export const GetExecutionSchema = z.object({
  instance: z.string().describe('Name of the N8N instance'),
  executionId: z.string().describe('ID of the execution'),
});

// Tool handlers
export class N8NToolHandlers {
  private instances: N8NInstance[];

  constructor(instances: N8NInstance[]) {
    this.instances = instances;
  }

  private getClient(instanceName: string): N8NClient {
    const instance = getInstanceByName(this.instances, instanceName);
    if (!instance) {
      const available = this.instances.map((i) => i.name).join(', ');
      throw new Error(
        `Instance "${instanceName}" not found. Available instances: ${available || 'none'}`
      );
    }
    return new N8NClient(instance);
  }

  // 1. List available instances
  async listInstances(): Promise<string> {
    if (this.instances.length === 0) {
      return 'No N8N instances configured. Set N8N_INSTANCES or N8N_URL/N8N_API_KEY environment variables.';
    }

    const instanceList = this.instances.map((inst) => ({
      name: inst.name,
      url: inst.url,
    }));

    return JSON.stringify(
      {
        count: instanceList.length,
        instances: instanceList,
      },
      null,
      2
    );
  }

  // 2. List workflows
  async listWorkflows(args: z.infer<typeof ListWorkflowsSchema>): Promise<string> {
    const client = this.getClient(args.instance);
    const result = await client.listWorkflows({
      active: args.active,
      tags: args.tags,
      limit: args.limit,
    });

    const workflows = result.data.map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      updatedAt: w.updatedAt,
      tags: w.tags?.map((t) => t.name) || [],
    }));

    return JSON.stringify(
      {
        instance: args.instance,
        count: workflows.length,
        workflows,
      },
      null,
      2
    );
  }

  // 3. Search workflows
  async searchWorkflows(args: z.infer<typeof SearchWorkflowsSchema>): Promise<string> {
    const client = this.getClient(args.instance);
    const result = await client.listWorkflows({
      active: args.active,
      limit: 200,
    });

    const query = args.query.toLowerCase();
    const filtered = result.data.filter((w) =>
      w.name.toLowerCase().includes(query)
    );

    const workflows = filtered.map((w) => ({
      id: w.id,
      name: w.name,
      active: w.active,
      updatedAt: w.updatedAt,
    }));

    return JSON.stringify(
      {
        instance: args.instance,
        query: args.query,
        count: workflows.length,
        workflows,
      },
      null,
      2
    );
  }

  // 4. Get workflow
  async getWorkflow(args: z.infer<typeof GetWorkflowSchema>): Promise<string> {
    const client = this.getClient(args.instance);
    const workflow = await client.getWorkflow(args.workflowId);

    return JSON.stringify(
      {
        instance: args.instance,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          active: workflow.active,
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
          tags: workflow.tags?.map((t) => t.name) || [],
          nodeCount: workflow.nodes?.length || 0,
          nodes: workflow.nodes?.map((n) => ({
            name: n.name,
            type: n.type,
          })),
          connections: workflow.connections,
          settings: workflow.settings,
        },
      },
      null,
      2
    );
  }

  // 5. Create workflow
  async createWorkflow(args: z.infer<typeof CreateWorkflowSchema>): Promise<string> {
    const client = this.getClient(args.instance);
    const workflow = await client.createWorkflow({
      name: args.name,
      nodes: args.nodes,
      connections: args.connections,
      settings: args.settings,
      active: args.active,
    });

    return JSON.stringify(
      {
        instance: args.instance,
        message: 'Workflow created successfully',
        workflow: {
          id: workflow.id,
          name: workflow.name,
          active: workflow.active,
          createdAt: workflow.createdAt,
        },
      },
      null,
      2
    );
  }

  // 6. Update workflow
  async updateWorkflow(args: z.infer<typeof UpdateWorkflowSchema>): Promise<string> {
    const client = this.getClient(args.instance);

    const updateData: Record<string, unknown> = {};
    if (args.name !== undefined) updateData.name = args.name;
    if (args.nodes !== undefined) updateData.nodes = args.nodes;
    if (args.connections !== undefined) updateData.connections = args.connections;
    if (args.settings !== undefined) updateData.settings = args.settings;
    if (args.active !== undefined) updateData.active = args.active;

    const workflow = await client.updateWorkflow(args.workflowId, updateData);

    return JSON.stringify(
      {
        instance: args.instance,
        message: 'Workflow updated successfully',
        workflow: {
          id: workflow.id,
          name: workflow.name,
          active: workflow.active,
          updatedAt: workflow.updatedAt,
        },
      },
      null,
      2
    );
  }

  // 7. Delete workflow
  async deleteWorkflow(args: z.infer<typeof DeleteWorkflowSchema>): Promise<string> {
    const client = this.getClient(args.instance);
    await client.deleteWorkflow(args.workflowId);

    return JSON.stringify(
      {
        instance: args.instance,
        message: `Workflow ${args.workflowId} deleted successfully`,
      },
      null,
      2
    );
  }

  // 8. Toggle workflow (activate/deactivate)
  async toggleWorkflow(args: z.infer<typeof ToggleWorkflowSchema>): Promise<string> {
    const client = this.getClient(args.instance);

    const workflow = args.active
      ? await client.activateWorkflow(args.workflowId)
      : await client.deactivateWorkflow(args.workflowId);

    return JSON.stringify(
      {
        instance: args.instance,
        message: `Workflow ${args.active ? 'activated' : 'deactivated'} successfully`,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          active: workflow.active,
        },
      },
      null,
      2
    );
  }

  // 9. Execute workflow
  async executeWorkflow(args: z.infer<typeof ExecuteWorkflowSchema>): Promise<string> {
    const client = this.getClient(args.instance);
    const result = await client.executeWorkflow(args.workflowId);

    return JSON.stringify(
      {
        instance: args.instance,
        message: 'Workflow execution started',
        executionId: result.data.executionId,
        workflowId: args.workflowId,
      },
      null,
      2
    );
  }

  // 10. List executions
  async listExecutions(args: z.infer<typeof ListExecutionsSchema>): Promise<string> {
    const client = this.getClient(args.instance);
    const result = await client.listExecutions({
      workflowId: args.workflowId,
      status: args.status,
      limit: args.limit,
    });

    const executions = result.data.map((e) => ({
      id: e.id,
      workflowId: e.workflowId,
      workflowName: e.workflowName,
      status: e.status,
      startedAt: e.startedAt,
      stoppedAt: e.stoppedAt,
      mode: e.mode,
    }));

    return JSON.stringify(
      {
        instance: args.instance,
        count: executions.length,
        executions,
      },
      null,
      2
    );
  }

  // 11. Get execution details
  async getExecution(args: z.infer<typeof GetExecutionSchema>): Promise<string> {
    const client = this.getClient(args.instance);
    const execution = await client.getExecution(args.executionId);

    return JSON.stringify(
      {
        instance: args.instance,
        execution: {
          id: execution.id,
          workflowId: execution.workflowId,
          workflowName: execution.workflowName,
          status: execution.status,
          mode: execution.mode,
          startedAt: execution.startedAt,
          stoppedAt: execution.stoppedAt,
          finished: execution.finished,
          retryOf: execution.retryOf,
          retrySuccessId: execution.retrySuccessId,
          data: execution.data,
        },
      },
      null,
      2
    );
  }
}

// Tool definitions for MCP
export const toolDefinitions = [
  {
    name: 'n8n_list_instances',
    description: 'List all available N8N instances configured in the server',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
  },
  {
    name: 'n8n_list_workflows',
    description: 'List all workflows in a specific N8N instance',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        active: {
          type: 'boolean',
          description: 'Filter by active status',
        },
        tags: {
          type: 'string',
          description: 'Filter by tags (comma-separated)',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of workflows to return',
          default: 100,
        },
      },
      required: ['instance'],
    },
  },
  {
    name: 'n8n_search_workflows',
    description: 'Search for workflows by name in a specific N8N instance',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        query: {
          type: 'string',
          description: 'Search query to filter workflows by name',
        },
        active: {
          type: 'boolean',
          description: 'Filter by active status',
        },
      },
      required: ['instance', 'query'],
    },
  },
  {
    name: 'n8n_get_workflow',
    description: 'Get detailed information about a specific workflow',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        workflowId: {
          type: 'string',
          description: 'ID of the workflow',
        },
      },
      required: ['instance', 'workflowId'],
    },
  },
  {
    name: 'n8n_create_workflow',
    description: 'Create a new workflow in a specific N8N instance',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        name: {
          type: 'string',
          description: 'Name of the new workflow',
        },
        nodes: {
          type: 'array',
          description: 'Workflow nodes',
        },
        connections: {
          type: 'object',
          description: 'Node connections',
        },
        settings: {
          type: 'object',
          description: 'Workflow settings',
        },
        active: {
          type: 'boolean',
          description: 'Whether to activate the workflow',
          default: false,
        },
      },
      required: ['instance', 'name'],
    },
  },
  {
    name: 'n8n_update_workflow',
    description: 'Update an existing workflow in a specific N8N instance',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to update',
        },
        name: {
          type: 'string',
          description: 'New name for the workflow',
        },
        nodes: {
          type: 'array',
          description: 'Updated workflow nodes',
        },
        connections: {
          type: 'object',
          description: 'Updated node connections',
        },
        settings: {
          type: 'object',
          description: 'Updated workflow settings',
        },
        active: {
          type: 'boolean',
          description: 'Whether to activate/deactivate the workflow',
        },
      },
      required: ['instance', 'workflowId'],
    },
  },
  {
    name: 'n8n_delete_workflow',
    description: 'Delete a workflow from a specific N8N instance',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to delete',
        },
      },
      required: ['instance', 'workflowId'],
    },
  },
  {
    name: 'n8n_toggle_workflow',
    description: 'Activate or deactivate a workflow in a specific N8N instance',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        workflowId: {
          type: 'string',
          description: 'ID of the workflow',
        },
        active: {
          type: 'boolean',
          description: 'Whether to activate (true) or deactivate (false) the workflow',
        },
      },
      required: ['instance', 'workflowId', 'active'],
    },
  },
  {
    name: 'n8n_execute_workflow',
    description: 'Execute a workflow in a specific N8N instance',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        workflowId: {
          type: 'string',
          description: 'ID of the workflow to execute',
        },
      },
      required: ['instance', 'workflowId'],
    },
  },
  {
    name: 'n8n_list_executions',
    description: 'List workflow executions in a specific N8N instance',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        workflowId: {
          type: 'string',
          description: 'Filter by workflow ID',
        },
        status: {
          type: 'string',
          enum: ['running', 'success', 'error', 'waiting', 'canceled'],
          description: 'Filter by execution status',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of executions to return',
          default: 20,
        },
      },
      required: ['instance'],
    },
  },
  {
    name: 'n8n_get_execution',
    description: 'Get detailed information about a specific execution',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instance: {
          type: 'string',
          description: 'Name of the N8N instance',
        },
        executionId: {
          type: 'string',
          description: 'ID of the execution',
        },
      },
      required: ['instance', 'executionId'],
    },
  },
];
