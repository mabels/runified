import { AddrPort } from "../types/app/config";
import { ActionHandler, HttpServer } from "../types/http_server";

export class MockHttpServer implements HttpServer {
  Handler?: ActionHandler;
  ListenAndServerFn?: (my: MockHttpServer) => Promise<void>;
  ShutdownFn?: (my: MockHttpServer) => Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  SetHandler(h: ActionHandler): void {
    this.Handler = h;
  }

  GetListenAddr(): AddrPort {
    return { Addr: "localhost", Port: 8080 };
  }

  ListenAndServe(): Promise<void> {
    return this.ListenAndServerFn ? this.ListenAndServerFn(this) : Promise.resolve();
  }
  Shutdown(): Promise<void> {
    return this.ShutdownFn ? this.ShutdownFn(this) : Promise.resolve();
  }
}
