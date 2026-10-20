import { convexAuth } from "@convex-dev/auth/server";
import { EmailCode } from "./lib/EmailCode";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [EmailCode],
});
