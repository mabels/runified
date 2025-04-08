import { NodeHttpServer } from ".";
import { setupTestServer } from "../test-server";

(async (): Promise<void> => {
  const nodeHttpServer = new NodeHttpServer({ Port: 8087 });
  return setupTestServer(nodeHttpServer).Start();
})().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
