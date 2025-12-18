/**
 * N8N MCP Server Types
 */

// Instance configuration
export interface N8NInstance {
  name: string;
  url: string;
  apiKey: string;
}

// Workflow types
export interface N8NWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: N8NTag[];
  nodes?: N8NNode[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
}

export interface N8NWorkflowListItem {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: N8NTag[];
}

export interface N8NTag {
  id: string;
  name: string;
}

export interface N8NNode {
  id?: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

// Execution types
export interface N8NExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowName?: string;
  status: 'running' | 'success' | 'error' | 'waiting' | 'canceled';
  data?: N8NExecutionData;
  retryOf?: string;
  retrySuccessId?: string;
}

export interface N8NExecutionData {
  resultData?: {
    runData?: Record<string, unknown>;
    error?: {
      message: string;
      stack?: string;
    };
  };
  executionData?: Record<string, unknown>;
}

export interface N8NExecutionListItem {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  workflowName?: string;
  status: string;
  retryOf?: string;
  retrySuccessId?: string;
}

// API Response types
export interface N8NListResponse<T> {
  data: T[];
  nextCursor?: string;
}

export interface N8NWorkflowCreateRequest {
  name: string;
  nodes?: N8NNode[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
  active?: boolean;
}

export interface N8NWorkflowUpdateRequest {
  name?: string;
  nodes?: N8NNode[];
  connections?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  staticData?: Record<string, unknown>;
  active?: boolean;
}

export interface N8NExecuteWorkflowRequest {
  workflowData?: Partial<N8NWorkflow>;
}

export interface N8NExecuteWorkflowResponse {
  data: {
    executionId: string;
  };
}

// Error type
export interface N8NAPIError {
  message: string;
  code?: string;
  httpCode?: number;
}
