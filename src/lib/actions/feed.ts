export type FeedIssue =
  | {
      source: "youtube";
      reason: "missing-config" | "api-denied" | "quota-exceeded" | "fetch-failed";
    }
  | { source: "reddit"; reason: "fetch-failed" };

export interface FeedResult {
  videos: VideoData[];
  /** Only allowlisted codes cross the fetch boundary, never upstream errors. */
  issues: FeedIssue[];
}
