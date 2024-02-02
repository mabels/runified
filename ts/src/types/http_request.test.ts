import { stream2string, string2stream } from "@adviser/cement/utils";
import { HttpHeader } from "./http_header";
import { DefaultHttpRequest } from "./http_request";

it("get request", () => {
  const r = DefaultHttpRequest({
    Method: "GET",
    URL: "http://localhost:8080/abc/def?m=1&n=2",
    Header: HttpHeader.from({ x: "1" }),
    Redirect: "follow",
  });
  expect({
    ...r,
    URL: r.URL.String(),
    Header: r.Header.AsRecordStringString(),
  }).toEqual({
    Method: "GET",
    URL: "http://localhost:8080/abc/def?m=1&n=2",
    Redirect: "follow",
    Header: { x: "1" },
  });
});

it("undef body request", () => {
  const r = DefaultHttpRequest({
    Method: "PUT",
    URL: "http://localhost:8080/abc/def?m=1&n=2",
    Header: HttpHeader.from({ x: "1" }),
  });
  expect({
    ...r,
    URL: r.URL.String(),
    Header: r.Header.AsRecordStringString(),
  }).toEqual({
    Method: "PUT",
    URL: "http://localhost:8080/abc/def?m=1&n=2",
    Header: { x: "1" },
  });
});

it("body request", async () => {
  const r = DefaultHttpRequest({
    Method: "PUT",
    URL: "http://localhost:8080/abc/def?m=1&n=2",
    Header: HttpHeader.from({ x: "1" }),
    Body: string2stream("hello world"),
  });
  expect({
    ...r,
    URL: r.URL.String(),
    Header: r.Header.AsRecordStringString(),
    Body: await stream2string(r.Body),
  }).toEqual({
    Method: "PUT",
    URL: "http://localhost:8080/abc/def?m=1&n=2",
    Header: { x: "1" },
    Body: "hello world",
  });
});
