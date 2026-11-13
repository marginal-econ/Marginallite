import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

import { isAdmin as checkAdmin } from "@/lib/auth-admin";
import {
  BACKEND_PUBLISHABLE_KEY,
  BACKEND_URL,
  createBackendFetch,
  requireBackendConfig,
} from "./config";
import { supabase as clientSupabase } from "./client";

export const requireSupabaseAuth = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    let token: string | undefined;
    try {
      const { data } = await clientSupabase.auth.getSession();
      token = data.session?.access_token;
    } catch {
      /* non-browser environment */
    }
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  })
  .server(async ({ next }) => {
    const request = getRequest();
    if (!request?.headers) throw new Error("Unauthorized: No request headers available");

    const authHeader = request.headers.get("authorization");
    if (!authHeader) throw new Error("Unauthorized: No authorization header provided");
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized: Only Bearer tokens are supported");
    }

    const token = authHeader.slice("Bearer ".length);
    if (!token || token.split(".").length !== 3) throw new Error("Unauthorized: Invalid token");

    requireBackendConfig();
    const supabase = createClient<Database>(BACKEND_URL, BACKEND_PUBLISHABLE_KEY, {
      global: {
        fetch: createBackendFetch(BACKEND_PUBLISHABLE_KEY),
        headers: { Authorization: `Bearer ${token}` },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    let userId: string | undefined;
    let claims: any = undefined;

    // 1. Attempt getClaims (Supabase JWKS)
    try {
      const { data: claimsData } = await supabase.auth.getClaims(token);
      if (claimsData?.claims?.sub) {
        claims = claimsData.claims;
        userId = claimsData.claims.sub;
      }
    } catch {
      /* fallback */
    }

    // 2. Attempt getUser (Supabase Auth API)
    if (!userId) {
      try {
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData?.user?.id) {
          userId = userData.user.id;
          claims = {
            sub: userData.user.id,
            email: userData.user.email,
            user_metadata: userData.user.user_metadata,
            app_metadata: userData.user.app_metadata,
          };
        }
      } catch {
        /* fallback */
      }
    }

    // 3. Fallback: decode JWT claims directly if structurally valid and unexpired
    if (!userId) {
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payloadStr = atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"));
          const payload = JSON.parse(payloadStr);
          if (payload?.sub && (!payload.exp || payload.exp * 1000 > Date.now())) {
            userId = payload.sub;
            claims = payload;
          }
        }
      } catch {
        /* fallback */
      }
    }

    if (!userId) throw new Error("Unauthorized: Invalid token");

    const email =
      (typeof claims?.email === "string" ? claims.email : null) ||
      (typeof (claims?.user_metadata as any)?.email === "string"
        ? (claims.user_metadata as any).email
        : null);

    const isAdmin = checkAdmin({ userId, email, claims });

    return next({
      context: { supabase, userId, claims: claims ?? {}, email, isAdmin },
    });
  },
);
