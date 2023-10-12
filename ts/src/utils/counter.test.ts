import { MockResponseWriter } from "../testutils";
import { HttpHeader } from "../types";
import { CalculateHeaderByteLength, CountingReadableStream, CountingResponseWriter, FilterHeaders } from "./counter";
import { stream2string } from "./stream2string";

describe("test filter", () => {
  it("CountingRequestReader", async () => {
    const rs = new CountingReadableStream(
      new ReadableStream<Uint8Array>({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("Hello"));
          controller.enqueue(encoder.encode(" "));
          controller.enqueue(encoder.encode("World"));
          controller.enqueue(encoder.encode("!"));
          controller.close();
        },
      }),
    );
    const res = await stream2string(rs);
    expect(res).toBe("Hello World!");
    expect(rs.ReadBytes).toBe(res.length);
  });

  it("CountingResponseWriter", async () => {
    const mw = new MockResponseWriter();
    const cw = new CountingResponseWriter(mw);
    cw.WriteHeader(200);
    cw.Header().Add("testHeader", "testHeader");
    await cw.Write("Hello World!");
    await cw.Write("Hello World!");
    await cw.End();
    expect(mw.Body).toBe("Hello World!Hello World!");
    expect(cw.WrittenBytes).toBe(24);
  });

  it("FilterHeaders", () => {
    const confidentialHeaderSlice = ["Authorization", "Cookie", "X-Request-ID"];
    const headers = new HttpHeader();

    headers.Add("testHeader", "testHeader");
    for (const header of confidentialHeaderSlice) {
      headers.Add(header, "testHeader");
    }
    const filteredHeaders = FilterHeaders(headers);
    expect(filteredHeaders.Items().length).toBe(1);
    for (const ch of confidentialHeaderSlice) {
      const f = filteredHeaders.Get(ch);
      expect(f).toBe(undefined);
    }
  });
  it("CalculateHeaderByteLength", () => {
    const headers = new HttpHeader();
    headers.Add("testHeader", "testHeader");
    headers.Add("testHeader", "testHeader2");
    const bytes = CalculateHeaderByteLength(headers);

    expect(bytes).toBe(49);
  });
});
