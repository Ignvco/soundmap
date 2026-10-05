import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
const crons = cronJobs();
crons.interval(
  "remove expired advisor quotas",
  { minutes: 5 },
  internal.quotas.cleanup,
);
export default crons;
