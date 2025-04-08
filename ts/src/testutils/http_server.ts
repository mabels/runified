import { ActionHandler, AddrPort, HttpServer } from "../types";

export class MockHttpServer implements HttpServer {
  Handler?: ActionHandler;
  ListenAndServerFn?: (my: MockHttpServer) => Promise<void>;
  ShutdownFn?: (my: MockHttpServer) => Promise<void>;

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
