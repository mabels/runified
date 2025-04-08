import { FromCommandLine } from "../../app.js";
import { MockApiHandler, MockHttpRequest } from "../../testutils.js";
import { SetCorsHeader } from "./set_cors.js";

describe("TestSetCors", () => {
  it("SetCors", async () => {
    const hdl = new MockApiHandler<never, never>(FromCommandLine([]), MockHttpRequest());
    expect(await SetCorsHeader(hdl)).toBeTruthy();
    expect(hdl.Response().Header().Get("Access-Control-Allow-Origin")).toBe("*");
  });
});
