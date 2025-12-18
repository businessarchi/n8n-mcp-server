/**
 * N8N API Client
 * Handles all HTTP requests to N8N instances
 */

import type {
  N8NInstance,
  N8NWorkflow,
  N8NWorkflowListItem,
  N8NWorkflowCreateRequest,
  N8NWorkflowUpdateRequest,
  N8NExecution,
  N8NExecutionListItem,
  N8NListResponse,
  N8NExecuteWorkflowResponse,
} from './types.js';

export class N8NClient {
  private instance: N8NInstance;

  constructor(instance: N8NInstance) {
    this.instance = instance;
  }

  private get baseUrl(): string {
    return `${this.instance.url}/api/v1`;
  }

  private get headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-N8N-API-KEY': this.instance.apiKey,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: this.headers,
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorBody = await response.json();
        if (errorBody.message) {
          errorMessage = errorBody.message;
        }
      } catch {
        // Use default error message
      }
      throw new Error(`N8N API Error: ${errorMessage}`);
    }

    // Handle empty responses (204 No Content)
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  // ==================== Workflows ====================

  /**
   * List all workflows
   */
  async listWorkflows(options?: {
    active?: boolean;
    tags?: string;
    limit?: number;
    cursor?: string;
  }): Promise<N8NListResponse<N8NWorkflowListItem>> {
    const params = new URLSearchParams();

    if (options?.active !== undefined) {
      params.set('active', String(options.active));
    }
    if (options?.tags) {
      params.set('tags', options.tags);
    }
    if (options?.limit) {
      params.set('limit', String(options.limit));
    }
    if (options?.cursor) {
      params.set('cursor', options.cursor);
    }

    const queryString = params.toString();
    const path = `/workflows${queryString ? `?${queryString}` : ''}`;

    return this.request<N8NListResponse<N8NWorkflowListItem>>('GET', path);
  }

  /**
   * Get a specific workflow by ID
   */
  async getWorkflow(id: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>('GET', `/workflows/${id}`);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    workflow: N8NWorkflowCreateRequest
  ): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>('POST', '/workflows', workflow);
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(
    id: string,
    workflow: N8NWorkflowUpdateRequest
  ): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>('PUT', `/workflows/${id}`, workflow);
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    await this.request<void>('DELETE', `/workflows/${id}`);
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(id: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>('POST', `/workflows/${id}/activate`);
  }

  /**
   * Deactivate a workflow
   */
  async deactivateWorkflow(id: string): Promise<N8NWorkflow> {
    return this.request<N8NWorkflow>('POST', `/workflows/${id}/deactivate`);
  }

  // ==================== Executions ====================

  /**
   * Execute a workflow
   */
  async executeWorkflow(id: string): Promise<N8NExecuteWorkflowResponse> {
    return this.request<N8NExecuteWorkflowResponse>(
      'POST',
      `/workflows/${id}/run`
    );
  }

  /**
   * List executions
   */
  async listExecutions(options?: {
    workflowId?: string;
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<N8NListResponse<N8NExecutionListItem>> {
    const params = new URLSearchParams();

    if (options?.workflowId) {
      params.set('workflowId', options.workflowId);
    }
    if (options?.status) {
      params.set('status', options.status);
    }
    if (options?.limit) {
      params.set('limit', String(options.limit));
    }
    if (options?.cursor) {
      params.set('cursor', options.cursor);
    }

    const queryString = params.toString();
    const path = `/executions${queryString ? `?${queryString}` : ''}`;

    return this.request<N8NListResponse<N8NExecutionListItem>>('GET', path);
  }

  /**
   * Get execution details
   */
  async getExecution(id: string): Promise<N8NExecution> {
    return this.request<N8NExecution>('GET', `/executions/${id}`);
  }

  /**
   * Delete an execution
   */
  async deleteExecution(id: string): Promise<void> {
    await this.request<void>('DELETE', `/executions/${id}`);
  }
}
