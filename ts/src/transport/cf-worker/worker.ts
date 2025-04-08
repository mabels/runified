// esbuild --bundle --sourcemap --outdir=dist --format=esm ./worker.ts

import { ExecutionContext } from "@cloudflare/workers-types";
import { FetchHttpServer } from "../fetch";
import { setupTestServer } from "../test-server";

export type Env = never;

const fetchHttpServer = new FetchHttpServer();
setupTestServer(fetchHttpServer);

export default {
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return await fetchHttpServer.fetchHandler(request);
	},
};
