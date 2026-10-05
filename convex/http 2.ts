import { httpRouter } from "convex/server";
import { advisorStream } from "./aiAdvisor";

const http = httpRouter();

http.route({
  path: "/advisor-stream",
  method: "POST",
  handler: advisorStream,
});

export default http;
