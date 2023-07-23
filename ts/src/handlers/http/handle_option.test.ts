// porting this go test to typescript

import { FromCommandLine } from "../../app";
import { MockApiHandler, MockHttpRequest, MockResponseWriter } from "../../testutils";
import { HandleOPTIONS } from "./handle_options";

describe("TestHandleOption", () => {
  it("HandleOptionsPass", async () => {
    const hdl = new MockApiHandler<never, never>(FromCommandLine([]), MockHttpRequest());
    expect(await HandleOPTIONS(hdl)).toBeTruthy();
    // expect(hdl.Response().Header().Get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("HandleOption", async () => {
    const hdl = new MockApiHandler<never, never>(
      FromCommandLine([]),
      MockHttpRequest({
        Method: "OPTIONS",
      })
    );
    expect(await HandleOPTIONS(hdl)).toBeFalsy();
    expect(hdl.Response().Header().Get("Access-Control-Allow-Methods")).toBe("POST,GET,PUT,PATCH,DELETE,OPTIONS");
    expect(hdl.Response().Header().Get("Access-Control-Allow-Headers")).toBe("Content-Type");
    expect(hdl.Response().Header().Get("Access-Control-Max-Age")).toBe("3600");
    expect((hdl.Response() as MockResponseWriter).StatusCode).toBe(204);
  });
});
