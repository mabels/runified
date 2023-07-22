import { HttpHeader } from "../types/http_header";
import { HttpResponseWriter } from "../types/http_response_writer";

export class MockResponseWriter implements HttpResponseWriter {
  readonly _header: HttpHeader = new HttpHeader();
  StatusCode = 0;
  Body: string;

  constructor() {
    this.Body = "";
  }

  Header(): HttpHeader {
    return this._header;
  }
  WriteHeader(statusCode: number) {
    this.StatusCode = statusCode;
  }

  Write(data: string | Uint8Array): Promise<number> {
    const startLen = this.Body.length;
    if (typeof data !== "string") {
      this.Body = this.Body + new TextDecoder().decode(data);
    } else {
      this.Body = this.Body + data;
    }
    return Promise.resolve(this.Body.length - startLen);
  }
  End(): Promise<void> {
    return Promise.resolve();
  }
}
