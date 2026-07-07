import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout for everything under /teams/$teamId — renders the matched child route
// (teams.$teamId.index.tsx for the team detail page, teams.$teamId.matches.tsx
// for the full match history page). Keep this file free of its own content;
// any content here must live in one of the child routes instead, or it will
// render for every child path.
export const Route = createFileRoute("/_authenticated/teams/$teamId")({
  component: () => <Outlet />,
});