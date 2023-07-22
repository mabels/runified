import { ApiHandler } from "../../app/api_handler";
import { MockApi } from "../api";
import { MockApp } from "../app";
import { FromCommandLine } from "../../app/cli_config";
import { RunifiedReq } from "../../generated/runified_req";
import { RunifiedRes, RunifiedResFactory } from "../../generated/runified_res";
import { MockLogger } from "../logger";
import { RunifiedReqFactory } from "../../generated/runified_req";
import { string2stream } from "../../utils/string2steam";
import { DefaultHttpRequest } from "../../types/http_request";
import { HttpStatusCode } from "../../types/http_statuscodes";
import { ErrorFactory } from "../../generated/error";
import { MockResponseWriter } from "../response_writer";
import { SystemAbstractionImpl } from "../../utils/system_abstraction";
import { TimeMode } from "../../types/sys_abstraction";

const reqObj = {
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
};

describe("api_handler", () => {
  it("ApiErrorMsg", async () => {
    const sys = new SystemAbstractionImpl({
      TimeMode: TimeMode.STEP,
    });
    const { logCollector: lc, logger } = MockLogger({
      sys: sys,
    });
    const mw = new MockResponseWriter();
    const mockApi = new MockApi({
      App: new MockApp({
        CliConfig: FromCommandLine([]),
        Log: logger,
        Sys: sys,
      }),
    });
    const hdl = new ApiHandler<RunifiedReq, RunifiedRes>({
      api: mockApi,
      logRef: mockApi.Log(),
      requestId: "wurstapi1",
      httpResponse: mw,
      requestTypeFactory: RunifiedReqFactory,
      httpRequest: DefaultHttpRequest({
        Method: "POST",
        URL: "test://test",
      }),
    });
    await hdl.ErrorMsg(new Error("test error"));
    const logs = lc.Logs();
    expect(logs.length).toBe(1);
    expect(logs[0]).toEqual({
      MockApi: "MockApi",
      error: "test error",
      level: "error",
      msg: "API error",
      ts: "2021-01-31T23:00:01.000Z",
    });
    expect(mw.StatusCode).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
    const body = mw.Body;
    const errMsg = ErrorFactory.Builder().Coerce(JSON.parse(body));
    expect(errMsg.unwrap().status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
    expect(errMsg.unwrap().requestId).toBe("wurstapi1");
    expect(errMsg.unwrap().message).toBe("test error");
  });

  it("WriteMsg", async () => {
    const mockApi = new MockApi({
      App: new MockApp({
        CliConfig: FromCommandLine([]),
      }),
    });

    // const req = RunifiedReqFactory.Builder().Coerce(reqObj)
    const res = RunifiedResFactory.Builder().Coerce({
      ...reqObj,
      createdAt: mockApi.App().Sys().Time().Now(),
    });

    const mw = new MockResponseWriter();

    const requestId = "WriteMsgTest";

    const hdl = new ApiHandler<RunifiedReq, RunifiedRes>({
      api: mockApi,
      logRef: mockApi.Log(),
      requestId: requestId,
      httpResponse: mw,
      requestTypeFactory: RunifiedReqFactory,
      httpRequest: DefaultHttpRequest({
        Method: "POST",
        URL: "test://test",
      }),
    });

    hdl.WriteMsg(res.unwrap());

    expect(mw.StatusCode).toBe(HttpStatusCode.OK);
    expect(mw.Header().Get("Content-Type")).toBe("application/json");
    expect(mw.Header().Get("X-Request-ID")).toBe(requestId);
    const retRes = RunifiedResFactory.Builder().Coerce(JSON.parse(mw.Body));
    expect(retRes.unwrap()).toEqual(res.unwrap());
  });

  it("RequestMessage", async () => {
    const mockApi = new MockApi({
      App: new MockApp({
        CliConfig: FromCommandLine([]),
      }),
    });
    const req = RunifiedReqFactory.Builder().Coerce(reqObj);
    const postReq = DefaultHttpRequest({
      Method: "POST",
      URL: "test://test",
      Body: string2stream(JSON.stringify(req.unwrap())),
    });
    const mw = new MockResponseWriter();

    const hdl = new ApiHandler<RunifiedReq, RunifiedRes>({
      api: mockApi,
      logRef: mockApi.Log(),
      httpRequest: postReq,
      requestId: "RequestMessageTest",
      httpResponse: mw,
      requestTypeFactory: RunifiedReqFactory,
    });
    expect(await hdl.RequestMsg()).toEqual(req.unwrap());
  });
});
