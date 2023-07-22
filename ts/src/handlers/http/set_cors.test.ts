import { FromCommandLine } from "../../app/cli_config";
import { MockApiHandler } from "../../testutils/api_handler";
import { MockHttpRequest } from "../../testutils/http_request";
import { SetCorsHeader } from "./set_cors";

describe("TestSetCors", () => {
  it("SetCors", async () => {
    const hdl = new MockApiHandler<never, never>(FromCommandLine([]), MockHttpRequest());
    expect(await SetCorsHeader(hdl)).toBeTruthy();
    expect(hdl.Response().Header().Get("Access-Control-Allow-Origin")).toBe("*");
  });
});
