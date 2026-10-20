import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval("purge demo orders older than 30 days", { hours: 24 }, internal.demo.purgeOld, {});

export default crons;
