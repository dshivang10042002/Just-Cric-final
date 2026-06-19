import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/matches")({
  head: () => ({ meta: [{ title: "Matches — JustCric" }] }),
  component: () => <Outlet />,
});
