import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware((auth, req) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/6dbe86e5-6bd5-4abf-8661-57fc49fd3515',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:'pre-fix',hypothesisId:'H0',location:'middleware.ts:4',message:'root middleware invoked',data:{pathname:req.nextUrl?.pathname},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  // allow all authenticated routes (Clerk enforces auth based on default config)
});

export const config = {
  matcher: [
    "/((?!_next|.*\\..*).*)",
    "/(api|trpc)(.*)"
  ],
};
