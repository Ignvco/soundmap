import { httpRouter } from "convex/server";
import { advisorStream, advisorOptions } from "./aiAdvisor";
const http = httpRouter();
http.route({ path: "/advisor-stream", method: "POST", handler: advisorStream });
http.route({
  path: "/advisor-stream",
  method: "OPTIONS",
  handler: advisorOptions,
});
export default http;
