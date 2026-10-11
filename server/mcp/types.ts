/**
 * Tipos do protocolo Model Context Protocol (MCP) v2024-11-05
 * Especificação: https://modelcontextprotocol.io/
 */

export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: Record<string, any>;
}

export interface JsonRpcResponse<T = any> {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface McpToolInputSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
    minimum?: number;
    maximum?: number;
    items?: any;
    maxItems?: number;
  }>;
  required?: string[];
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: McpToolInputSchema;
}

export interface McpInitializeResult {
  protocolVersion: string;
  capabilities: {
    tools: {
      listChanged?: boolean;
    };
    logging?: {};
  };
  serverInfo: {
    name: string;
    version: string;
    description?: string;
  };
}

export interface McpContentItem {
  type: 'text' | 'image' | 'resource';
  text?: string;
  data?: string;
  mimeType?: string;
}

export interface McpCallResult {
  content: McpContentItem[];
  isError?: boolean;
  _meta?: Record<string, any>;
}
