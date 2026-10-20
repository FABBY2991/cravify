/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as assets from "../assets.js";
import type * as auth from "../auth.js";
import type * as catalog from "../catalog.js";
import type * as crons from "../crons.js";
import type * as demo from "../demo.js";
import type * as hero from "../hero.js";
import type * as http from "../http.js";
import type * as lib_EmailCode from "../lib/EmailCode.js";
import type * as lib_access from "../lib/access.js";
import type * as lib_images from "../lib/images.js";
import type * as lib_limits from "../lib/limits.js";
import type * as lib_orderFlow from "../lib/orderFlow.js";
import type * as lib_orderStore from "../lib/orderStore.js";
import type * as lib_resend from "../lib/resend.js";
import type * as lib_settings from "../lib/settings.js";
import type * as lib_text from "../lib/text.js";
import type * as menu from "../menu.js";
import type * as orders from "../orders.js";
import type * as rateLimits from "../rateLimits.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  assets: typeof assets;
  auth: typeof auth;
  catalog: typeof catalog;
  crons: typeof crons;
  demo: typeof demo;
  hero: typeof hero;
  http: typeof http;
  "lib/EmailCode": typeof lib_EmailCode;
  "lib/access": typeof lib_access;
  "lib/images": typeof lib_images;
  "lib/limits": typeof lib_limits;
  "lib/orderFlow": typeof lib_orderFlow;
  "lib/orderStore": typeof lib_orderStore;
  "lib/resend": typeof lib_resend;
  "lib/settings": typeof lib_settings;
  "lib/text": typeof lib_text;
  menu: typeof menu;
  orders: typeof orders;
  rateLimits: typeof rateLimits;
  seed: typeof seed;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
