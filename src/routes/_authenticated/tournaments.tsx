import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/tournaments")({
  head: () => ({ meta: [{ title: "Tournaments — JustCric" }] }),
  component: () => <Outlet />,
});
