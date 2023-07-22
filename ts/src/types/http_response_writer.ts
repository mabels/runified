import { HttpHeader } from "./http_header";

export interface HttpResponseWriter {
  WriteHeader(statusCode: number): void;
  Write(data?: string | Uint8Array): Promise<number>;
  End(): Promise<void>;
  Header(): HttpHeader;
}
