/* eslint-disable */
  /**
   * Generated `api` utility.
   *
   * THIS CODE IS AUTOMATICALLY GENERATED.
   *
   * To regenerate, run `npx convex dev`.
   * @module
   */

  import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
  import type * as aiAdvisor from "../aiAdvisor.js";
import type * as http from "../http.js";
import type * as quotas from "../quotas.js";
import type * as workspaces from "../workspaces.js";
import type * as catalog from "../catalog.js";

  /**
   * A utility for referencing Convex functions in your app's API.
   *
   * Usage:
   * ```js
   * const myFunctionReference = api.myModule.myFunction;
   * ```
   */
  declare const fullApi: ApiFromModules<{
    "aiAdvisor": typeof aiAdvisor,
"http": typeof http,
"quotas": typeof quotas,
"workspaces": typeof workspaces,
"catalog": typeof catalog,
  }>;
  export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
  export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
