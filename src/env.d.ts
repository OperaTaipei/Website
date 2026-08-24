/// <reference path="../.astro/types.d.ts" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

interface Env {
  DB: import("@cloudflare/workers-types").D1Database;
  MEDIA_BUCKET: import("@cloudflare/workers-types").R2Bucket;
}

declare namespace App {
  interface Locals extends Runtime {}
}