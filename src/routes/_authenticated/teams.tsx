import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/teams")({
  head: () => ({ meta: [{ title: "Teams — JustCric" }] }),
  component: () => <Outlet />,
});
