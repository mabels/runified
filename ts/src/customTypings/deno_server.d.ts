declare module "https://deno.land/std@0.184.0/http/server.ts" {
  export function serve(fn: (fetchReq: Request) => Promise<Response>, { port: number }): Promise<void>;
}
