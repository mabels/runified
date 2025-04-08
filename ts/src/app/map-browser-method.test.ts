import { MockHttpRequest } from "../testutils.js";
import { HttpHeader, HttpRequest } from "../types/index.js";
import { MapBrowserMethod } from "./map-browser-method.js";

describe("TestMapBrowserMethod", () => {
  it("method", () => {
    const req: HttpRequest = MockHttpRequest();

    const mreq = MapBrowserMethod(req);
    expect(mreq.Method).toBe("GET");
  });
  it("method override", () => {
    const req: HttpRequest = MockHttpRequest({
      Header: HttpHeader.from({
        "X-HTTP-Method-Override": "POST",
      }),
    });

    const mreq = MapBrowserMethod(req);
    expect(mreq.Method).toBe("POST");
  });
  it("method override empty", () => {
    const req: HttpRequest = MockHttpRequest({
      Header: HttpHeader.from({
        "X-HTTP-Method-Override": "",
      }),
      Method: "POST",
    });

    const mreq = MapBrowserMethod(req);
    expect(mreq.Method).toBe("POST");
  });
});
