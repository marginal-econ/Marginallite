import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/exemplar")({
  beforeLoad: () => {
    throw redirect({ to: "/" });
  },
  component: () => null,
});
