import { createFileRoute, redirect } from "@tanstack/react-router";

// AI-generated MCQ papers have been removed as a product decision — MCQ
// practice is now past-paper (PDF) only, at /mcq-live. Every in-app link —
// the sidebar, the homepage, the question bank — now points straight at
// /mcq-live. This route is kept only so an old bookmark/external link to
// /mcq still lands somewhere real instead of 404ing. The old generation UI
// (createMcqPaper / generateMcqBatch and everything built on top of them,
// including the bank-questions paper builder) is not referenced anywhere
// anymore; see MCQ_LIVE_NOTES.md.
export const Route = createFileRoute("/_authenticated/mcq")({
  beforeLoad: () => {
    throw redirect({ to: "/mcq-live" });
  },
});
