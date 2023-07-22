import { FromCommandLine } from "../../app/cli_config";
import { MockApiHandler } from "../../testutils/api_handler";
import { MockHttpRequest } from "../../testutils/http_request";
import { MockResponseWriter } from "../../testutils/response_writer";
import { HttpStatusCode } from "../../types/http_statuscodes";
import { AllowMethods } from "./allow_methods";

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
        Method: "BRETT",
      })
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
          Method: method,
        })
      );
      expect(await fn(hdl)).toBeTruthy();
      expect((hdl.Response() as MockResponseWriter).StatusCode).toBe(0);
    }
  });
});
