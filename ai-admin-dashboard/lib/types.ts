export type TagSite = {
  id: number;
  domain: string;
  label?: string | null;
  created_at: string;
};

export type TagQueryResponse = {
  answer: string;
  sources: string[];
  used_domains: string[];
};