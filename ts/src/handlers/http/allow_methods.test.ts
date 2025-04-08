import { FromCommandLine } from "../../app.js";
import { MockApiHandler, MockHttpRequest, MockResponseWriter } from "../../testutils.js";
import { HttpMethods, HttpStatusCode } from "../../types/index.js";
import { AllowMethods } from "./allow_methods.js";

describe("TestAllowMethod", () => {
  it("AllowMethodEmpty", async () => {
    const hdl = new MockApiHandler<never, never>(FromCommandLine([]), MockHttpRequest());
    const fn = AllowMethods();
    expect(await fn(hdl)).toBeTruthy();
  });

  it("AllowMethodNotHit", async () => {
    const fn = AllowMethods("TEST", "REST");
    const hdl = new MockApiHandler<never, never>(
      FromCommandLine([]),
      MockHttpRequest({
        Method: "BRETT" as HttpMethods,
      }),
    );
    expect(await fn(hdl)).toBeFalsy();
    expect((hdl.Response() as MockResponseWriter).StatusCode).toBe(HttpStatusCode.METHOD_NOT_ALLOWED);
  });
  it("AllowMethodMatch", async () => {
    const methods = ["TEST", "REST"];
    const fn = AllowMethods(...methods);
    for (const method of methods) {
      const hdl = new MockApiHandler<never, never>(
        FromCommandLine([]),
        MockHttpRequest({
          Method: method as HttpMethods,
        }),
      );
      expect(await fn(hdl)).toBeTruthy();
      expect((hdl.Response() as MockResponseWriter).StatusCode).toBe(0);
    }
  });
});
