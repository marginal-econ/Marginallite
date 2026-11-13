/** A user counts as "online" if their last heartbeat is newer than this. */
export const ONLINE_WINDOW_SECONDS = 150;

/** How often a signed-in, visible tab pings the server. */
export const HEARTBEAT_INTERVAL_MS = 60_000;

const PATH_LABELS: [prefix: string, label: string][] = [
  ["/grade", "Response marking"],
  ["/essay/", "Reviewing a response"],
  ["/response-structure", "Response structure"],
  ["/practice", "AO skills coach"],
  ["/essay-generator", "Essay generator"],
  ["/diagrams", "Diagram library"],
  ["/question-bank", "Question bank"],
  ["/mcq-live", "MCQ papers"],
  ["/mcq", "MCQ papers"],
  ["/review", "Review panel"],
  ["/dashboard", "Dashboard"],
  ["/knowledge", "Knowledge base"],
  ["/calibration", "Calibration"],
  ["/content-admin", "Content admin"],
  ["/mcq-papers-admin", "MCQ paper library"],
  ["/admin", "Admin console"],
  ["/settings", "Settings"],
];

/** Turns a route path into a human "what are they doing" label. */
export function describePath(path: string | null | undefined): string {
  if (!path) return "—";
  const hit = PATH_LABELS.find(([prefix]) => path.startsWith(prefix));
  return hit ? hit[1] : path;
}
