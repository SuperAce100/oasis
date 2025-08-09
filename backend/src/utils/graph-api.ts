import axios, { AxiosResponse } from 'axios';
import { INTERNAL_ERROR, UNAUTHORIZED, BAD_REQUEST } from './errors.js';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

export interface GraphAPIOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: any;
  params?: Record<string, any>;
}

/**
 * Call Microsoft Graph API with access token
 */
export async function callGraphAPI(options: GraphAPIOptions): Promise<any> {
  const token = process.env.OUTLOOK_TOKEN;
  
  if (!token) {
    throw UNAUTHORIZED('OUTLOOK_TOKEN environment variable not set');
  }

  try {
    const config = {
      method: options.method,
      url: `${GRAPH_BASE_URL}/${options.endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: options.data,
      params: options.params,
    };

    const response: AxiosResponse = await axios(config);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.error?.message || error.message;
      
      if (status === 401) {
        throw UNAUTHORIZED(`Graph API authentication failed: ${message}`);
      } else if (status >= 400 && status < 500) {
        throw BAD_REQUEST(`Graph API error: ${message}`);
      } else {
        throw INTERNAL_ERROR(`Graph API error: ${message}`);
      }
    } else {
      throw INTERNAL_ERROR(`Network error calling Graph API: ${error.message}`);
    }
  }
}

/**
 * Helper to build OData query parameters
 */
export function buildODataParams(options: {
  select?: string[];
  filter?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
}): Record<string, string> {
  const params: Record<string, string> = {};
  
  if (options.select) {
    params['$select'] = options.select.join(',');
  }
  
  if (options.filter) {
    params['$filter'] = options.filter;
  }
  
  if (options.orderBy) {
    params['$orderby'] = options.orderBy;
  }
  
  if (options.top) {
    params['$top'] = options.top.toString();
  }
  
  if (options.skip) {
    params['$skip'] = options.skip.toString();
  }
  
  return params;
}