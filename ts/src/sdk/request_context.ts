import { stream2uint8array, uint8array2stream } from "@adviser/cement/utils";
import {
  DefaultHttpRequest,
  ErrSdkHttpRequestFailed,
  HttpRequest,
  HttpResponse,
  HttpURL,
  JsonSerDe,
  SDKContext,
  SerDe,
  Stats,
} from "../types";
import { CalculateHeaderByteLength } from "../utils";

import { SDKClient } from "./sdk";
import { v4 } from "uuid";
import { WuestenFactory } from "wueste/wueste";

interface WriteableStats {
  Length?: number;
  Bytes?: Uint8Array;
  Start?: Date;
  End?: Date;
}
interface WriteableStatsStartSet {
  Length?: number;
  Bytes?: Uint8Array;
  Start: Date;
  End?: Date;
}

interface BuildHttpValueStats<T, S, V> {
  Http?: T;
  Value?: V;
  Stats: S;
}

export class RequestContext<QT, QI, QO, ST, SI, SO> {
  readonly Request: BuildHttpValueStats<HttpRequest, WriteableStatsStartSet, QT>;
  readonly Response: BuildHttpValueStats<HttpResponse, WriteableStats, ST>;
  readonly RequestId: string;
  _called = false;
  // Duration?: number;

  readonly _sdkClient: SDKClient;

  readonly _reqFac: WuestenFactory<QT, QI, QO>;
  readonly _reqSerDe: SerDe<QT>;

  readonly _resFac: WuestenFactory<ST, SI, SO>;
  readonly _resSerDe: SerDe<ST>;

  constructor(
    c: SDKClient,
    reqFac: WuestenFactory<QT, QI, QO>,
    resFac: WuestenFactory<ST, SI, SO>,
    params?: { RequestID: string },
  ) {
    this.Request = {
      Stats: { Start: c.Sys.Time().Now() },
    };
    this.Response = {
      Stats: {},
    };
    if (params) {
      this.RequestId = params.RequestID;
    } else {
      this.RequestId = v4();
    }
    this._sdkClient = c;
    this._reqFac = reqFac;
    this._reqSerDe = new JsonSerDe(reqFac);
    this._resFac = resFac;
    this._resSerDe = new JsonSerDe(resFac);
  }

  build(): SDKContext<QT, ST> {
    // if (!this.Result) {
    //   throw "Result is undefined";
    // }
    if (!this.RequestId) {
      throw "RequestId is undefined";
    }
    if (!this.Request) {
      throw "Request is undefined";
    }
    if (!this.Response) {
      throw "Response is undefined";
    }
    // if (!this.Duration) {
    //   throw "Duration is undefined";
    // }
    if (!this.Response.Value) {
      throw "Response.Value is undefined";
    }
    if (!this.Request.Value) {
      throw "Request.Value is undefined";
    }
    if (!this.Request.Http) {
      throw "Request.Http is undefined";
    }
    if (!this.Response.Http) {
      throw "Response.Http is undefined";
    }

    return {
      // Result: this.Result,
      RequestId: this.RequestId,
      Request: {
        Http: this.Request.Http,
        Stats: this.buildStats(this.Request.Stats),
        Value: this.Request.Value,
      },
      Response: {
        Http: this.Response.Http,
        Stats: this.buildStats(this.Response.Stats),
        Value: this.Response.Value,
      },
      // Duration: this.Duration,
      BaseUrl: this._sdkClient.BaseUrl,
      Duration(): number {
        return this.Response.Stats.End.getTime() - this.Request.Stats.Start.getTime();
      },
    };
  }

  buildStats(s: WriteableStats): Stats {
    if (!s.Start) {
      throw "Start is undefined";
    }
    if (!s.End) {
      throw "End is undefined";
    }
    if (!s.Bytes) {
      throw "Bytes is undefined";
    }
    if (!s.Length) {
      throw "Length is undefined";
    }
    return new Stats({
      Start: s.Start,
      End: s.End,
      Bytes: s.Bytes,
      Length: s.Length,
    });
  }

  async post(path: string, requestData: QT): Promise<HttpResponse> {
    if (this._called) {
      throw "post was already called";
    }
    this._called = true;
    try {
      const reqUrl = HttpURL.join(this._sdkClient.BaseUrl, path);
      const json = this._reqSerDe.Marshal(requestData);
      if (json.is_err()) {
        throw json.unwrap_err();
      }
      this._sdkClient.Logger.Debug().Any("json", txtDecoder.decode(json.unwrap())).Msg("Request JSON");
      const postReq = DefaultHttpRequest({
        URL: reqUrl,
        Method: "POST",
        Body: uint8array2stream(json.unwrap()),
      });

      postReq.Header.Set("Content-Type", "application/json");
      postReq.Header.Set("Accept", "application/json");
      postReq.Header.Set("X-Request-ID", this.RequestId);
      for (const [k, v] of this._sdkClient.DefaultRequestHeaders.Items()) {
        postReq.Header.Set(k, v);
      }

      this.Request.Stats.Length = json.unwrap().length + CalculateHeaderByteLength(postReq.Header);
      this.Request.Stats.Bytes = json.unwrap();
      this.Request.Stats.End = this._sdkClient.Sys.Time().Now();

      this.Request.Value = requestData;
      this.Request.Http = postReq;

      this.Response.Stats.Start = this.Request.Stats.End;
      const postResponse = await this._sdkClient.Client.Do(postReq);
      this.Response.Http = postResponse;
      if (postResponse.StatusCode != 200) {
        const body = txtDecoder.decode(await stream2uint8array(postResponse.Body));
        const err = new ErrSdkHttpRequestFailed(postReq, postResponse);
        this._sdkClient.Logger.Error()
          .Err(err)
          .Any("req", postReq)
          .Any("res", { ...postResponse, body })
          .Msg("Request failed");
        return Promise.reject(err);
      }
      return Promise.resolve(postResponse);
    } catch (e) {
      return Promise.reject(e);
    }
  }
}

const txtDecoder = new TextDecoder();

export async function postWithRequestContext<QT, QI, QO, ST, SI, SO>(
  c: SDKClient,
  url: string,
  reqFactory: WuestenFactory<QT, QI, QO>,
  resFactory: WuestenFactory<ST, SI, SO>,
  reqData: QT,
  // fn: ctxFunction<QQ, QQQ, SS, SSS>
  params?: { RequestID: string },
): Promise<SDKContext<QT, ST>> {
  try {
    const ctx = new RequestContext(c, reqFactory, resFactory, params);
    const resp = await ctx.post(url, reqData);

    const bodyBytes = await stream2uint8array(resp.Body);
    const bodyRes = ctx._resSerDe.Unmarshal(bodyBytes);
    if (bodyRes.is_err()) {
      throw bodyRes.unwrap_err();
    }

    // const bytes = await stream2string(postResponse.Body);
    ctx.Response.Stats.Length = bodyBytes.length + CalculateHeaderByteLength(resp.Header);
    ctx.Response.Stats.Bytes = bodyBytes;
    ctx.Response.Value = bodyRes.unwrap();
    ctx.Response.Http = resp;
    // await fn(ctx, bodyRes.unwrap());

    ctx.Response.Stats.End = c.Sys.Time().Now();
    // ctx.Duration = ctx.Stats.Response.End.getTime() - ctx.Stats.Request.Start.getTime();

    return Promise.resolve(ctx.build());
  } catch (err) {
    return Promise.reject(err);
  }
}
