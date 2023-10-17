// import { WuestenAttribute } from "wueste/wueste";
import { HttpRequest } from "./http_request";
import { HttpResponse } from "./http_response";
// import { Duration } from "./time";

export interface StatsValue {
  readonly Length: number;
  readonly Bytes: Uint8Array;
  readonly Start: Date;
  readonly End: Date;
}
export class Stats implements StatsValue {
  readonly Length: number;
  readonly Bytes: Uint8Array;
  readonly Start: Date;
  readonly End: Date;

  constructor(val: StatsValue) {
    this.Length = val.Length;
    this.Bytes = val.Bytes;
    this.Start = val.Start;
    this.End = val.End;
  }

  Duration(): number {
    return this.End.getTime() - this.Start.getTime();
  }
}

export interface HttpValueStats<T, S, V> {
  Http: T;
  Value: V;
  Stats: S;
}

export interface SDKContext<QT, ST> {
  // readonly Result: TT;
  readonly RequestId: string;
  readonly Request: HttpValueStats<HttpRequest, Stats, QT>;
  readonly Response: HttpValueStats<HttpResponse, Stats, ST>;
  readonly BaseUrl: string;
  Duration(): number;
}

export class ErrSdkHttpRequestFailed extends Error {
  readonly Request: HttpRequest;
  readonly Response: HttpResponse;
  constructor(req: HttpRequest, res: HttpResponse) {
    super("HTTP Response StatusCode is: " + res.StatusCode);
    this.Request = req;
    this.Response = res;
  }
}
