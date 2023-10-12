import { NewMockHttpClient } from "../testutils";
import { SDKClient, SdkClientParams } from "./sdk";
import { postWithRequestContext } from "./request_context";
import { RunifiedReq, RunifiedReqFactory } from "../generated/runifiedreq";
import { RunifiedResFactory } from "../generated/runifiedres";
import { ErrSdkHttpRequestFailed, HttpHeader, JsonSerDe, TimeMode, TimeUnits } from "../types";
import { SystemAbstractionImpl, string2stream, uint8array2stream } from "../utils";
import { v4 } from "uuid";


const reqData = RunifiedReqFactory.Builder().Coerce({
  id: "id",
  contract: "contract",
  collectionAddress: "collectionAddress",
  price: {
    amount: {
      raw: 4711.11,
    }
  },
  tokenId: "tokenId",
  source: {
    name: "uri",
  }
}).unwrap();

describe("TestRequestContext", () => {
  it("TestRequestContextErrorStatusCode", async () => {
    const sdk = new SDKClient({
      BaseUrl: "http://localhost:8080",
      Client: NewMockHttpClient({
        StatusCode: 4711,
      }),
    } as SdkClientParams);

    try {

      const ctx = await postWithRequestContext(sdk, "/test", RunifiedReqFactory, RunifiedResFactory, reqData);
      expect(ctx).toBeNull();
    } catch (e) {
      const res = e as ErrSdkHttpRequestFailed;
      expect(res.Response.StatusCode).toBe(4711);
    }
  });

  it("TestRequestContextMarshalError", async () => {
    const sdk = new SDKClient({
      BaseUrl: "http://localhost:8080",
      Client: NewMockHttpClient({
        StatusCode: 200,
        Body: string2stream("{-}"),
      }),
    });
    try {
      const ctx = await postWithRequestContext(sdk, "/test", RunifiedReqFactory, RunifiedResFactory, reqData);
      expect(ctx).toBeNull();
    } catch (e) {
      const res = e as Error;
      expect(res.message).toContain("Unexpected number in JSON at position 1");
    }
  });

  it("TestRequestContextOK", async () => {
    const sys = new SystemAbstractionImpl({
      TimeMode: TimeMode.STEP,
    });
    const reqVal = RunifiedReqFactory.Builder()
      .Coerce({
        collectionAddress: "collectionAddress",
        contract: "contract",
        id: "id",
        price: {
          amount: {
            raw: 4711.11,
          },
        },
        source: {
          name: "uri",
        },
        tokenId: "tokenId",
      })
      .unwrap();
    const resVal = RunifiedResFactory.Builder()
      .Coerce({
        collectionAddress: reqVal.collectionAddress!,
        contract: reqVal.contract!,
        id: reqVal.id!,
        price: {
          amount: {
            raw: reqVal.price!.amount!.raw!,
          },
        },
        source: {
          name: reqVal.source!.name!,
        },
        tokenId: "tokenId",
        createdAt: sys.Time().Now(),
      })
      .unwrap();
    const res = new JsonSerDe(RunifiedResFactory).Marshal(resVal).unwrap();

    const reqId = v4();
    const sdk = new SDKClient({
      BaseUrl: "http://localhost:8080",
      Client: NewMockHttpClient({
        StatusCode: 200,
        Body: uint8array2stream(res),
        Header: HttpHeader.from({
          "X-Request-ID": reqId,
        }),
      }),
      Sys: sys,
    });
    const rctx = await postWithRequestContext(sdk, "/test", RunifiedReqFactory, RunifiedResFactory, reqVal, {
      RequestID: reqId,
    });
    expect(rctx.Response.Value).toEqual(resVal);

    expect(rctx.RequestId).toBe(reqId);
    expect(rctx.Response.Http.Header?.Get("X-Request-ID")).toBe(reqId);
    expect(rctx.Duration()).toBe(2 * TimeUnits.Second);
    expect(rctx.Request.Value).toEqual(reqVal);
    expect(rctx.Request.Stats.Length).toBe(292);
    expect(rctx.Request.Stats.Duration()).toBe(1 * TimeUnits.Second);

    expect(rctx.Response.Value).toEqual(resVal);
    expect(rctx.Response.Stats.Bytes.length).toEqual(193);
    expect(rctx.Response.Stats.Length).toEqual(245);
    expect(rctx.Response.Stats.Duration()).toBe(1 * TimeUnits.Second);

    expect(rctx.Request.Stats.Duration() + rctx.Response.Stats.Duration()).toEqual(rctx.Duration());
  });
});
