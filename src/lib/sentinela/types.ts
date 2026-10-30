export type PlatformHealthStatus = "HEALTHY" | "WARNING" | "CRITICAL" | "UNKNOWN";
export type IncidentSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type IncidentStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "IGNORED";
export type AutonomyLevel = 1 | 2 | 3;
export type ActionType = 
  | "DIAGNOSTIC" 
  | "CACHE_PURGE" 
  | "RETRY_OUTBOX" 
  | "OPTIMIZE_INDEX" 
  | "CODE_PATCH" 
  | "DB_CLEANUP";

export interface ProbeResult {
  name: string;
  category: "database" | "api" | "runtime" | "frontend" | "infrastructure";
  status: "OK" | "WARNING" | "ERROR";
  latencyMs: number;
  message: string;
  details?: any;
}

export interface PlatformHealthReport {
  timestamp: string;
  status: PlatformHealthStatus;
  score: number; // 0 to 100%
  probes: ProbeResult[];
  summary: {
    totalProbes: number;
    passedProbes: number;
    warningProbes: number;
    failedProbes: number;
    avgLatencyMs: number;
  };
  metrics: {
    database: {
      connected: boolean;
      latencyMs: number;
      tableCounts: Record<string, number>;
      pendingOutboxCount: number;
    };
    runtime: {
      uptimeSeconds: number;
      memoryMb: {
        heapUsed: number;
        heapTotal: number;
        rss: number;
      };
      nodeVersion: string;
      environment: string;
    };
    apis: {
      tested: number;
      healthy: number;
      avgLatencyMs: number;
      endpoints: Array<{
        name: string;
        path: string;
        statusCode: number;
        latencyMs: number;
        status: "OK" | "ERROR";
      }>;
    };
    git: {
      branch: string;
      latestCommitHash: string;
      latestCommitMessage: string;
      latestCommitDate: string;
    };
  };
  activeIncidentsCount: number;
  pendingActionsCount: number;
}

export interface SentinelaChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  evidence?: any;
  suggestedAction?: {
    id?: string;
    title: string;
    type: ActionType;
    autonomyLevel: AutonomyLevel;
    requiresApproval: boolean;
  };
}
