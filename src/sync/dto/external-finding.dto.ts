export interface ExternalFinding {
  id: string;
  type: string; // "SAST" | "SCA" como vem da API — validação/cast acontece no sync.service
  repository: string;
  branch: string;
  commit: string;
  language: string;
  category: string;
  title: string;
  description: string;
  ruleId: string;
  file: string;
  line: number;
  score: number;
  status: string; // "OPEN" | "FIXED" | "IGNORED" como vem da API
  author: string;
  detectedAt: string;
  updatedAt: string;
}

export interface ExternalFindingsPage {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  data: ExternalFinding[];
}
