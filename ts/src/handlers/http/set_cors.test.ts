import { FromCommandLine } from "../../app";
import { MockApiHandler, MockHttpRequest } from "../../testutils";
import { SetCorsHeader } from "./set_cors";

describe("TestSetCors", () => {
  it("SetCors", async () => {
    const hdl = new MockApiHandler<never, never>(FromCommandLine([]), MockHttpRequest());
    expect(await SetCorsHeader(hdl)).toBeTruthy();
    expect(hdl.Response().Header().Get("Access-Control-Allow-Origin")).toBe("*");
  });
});
