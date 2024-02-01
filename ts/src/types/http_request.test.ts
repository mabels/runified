import { stream2string, string2stream } from "../utils";
import { HttpHeader } from "./http_header";
import { DefaultHttpRequest, HttpURL } from "./http_request";

it("test from string", () => {
  const url = HttpURL.parse("http://localhost:8080/abc/def?m=1&n=2").unwrap();
  expect(url.Scheme).toBe("http:");
  expect(url.Hostname).toBe("localhost");
  expect(url.Port).toBe("8080");
  expect(url.Path).toBe("/abc/def");
  expect(Object.fromEntries(url.SearchParams.Entries())).toEqual({ m: "1", n: "2" });
});

it("test from object", () => {
  const inner = HttpURL.parse("http://localhost:8080/abc/def?m=1&n=2");
  const url = HttpURL.parse(inner).unwrap();
  inner.Ok().SetPath("/dkdkdkd");
  expect(url.Scheme).toBe("http:");
  expect(url.Hostname).toBe("localhost");
  expect(url.Port).toBe("8080");
  expect(url.Path).toBe("/abc/def");
  expect(Object.fromEntries(url.SearchParams.Entries())).toEqual({ m: "1", n: "2" });
});

it("test setPathname", () => {
  const hurl = HttpURL.parse("http://localhost:8080/abc/def?m=1&n=2").unwrap();
  hurl.SetPath("bla/", "/bli", "bl//ub");
  expect(hurl.Scheme).toBe("http:");
  expect(hurl.Hostname).toBe("localhost");
  expect(hurl.Port).toBe("8080");
  expect(hurl.Path).toBe("/bla/bli/bl//ub");
  hurl.SetPath("//////bla/", "/bli", "bl//ub");
  expect(hurl.Path).toBe("//////bla/bli/bl//ub");
  expect(Object.fromEntries(hurl.SearchParams.Entries())).toEqual({ m: "1", n: "2" });
});

it("test search interaction", () => {
  const hurl = HttpURL.parse("http://localhost:8080/abc/def").unwrap();
  hurl.SetSearch("?m=1&n=2");
  expect(Object.fromEntries(hurl.SearchParams.Entries())).toEqual({ m: "1", n: "2" });
  expect(hurl.Href).toBe("http://localhost:8080/abc/def?m=1&n=2");
  hurl.SearchParams.Set("m", "3");
  hurl.SearchParams.Set("x", "9");
  expect(hurl.Href).toBe("http://localhost:8080/abc/def?m=3&n=2&x=9");
});

it("throws error on invalid url", () => {
  expect(() => HttpURL.parse("der meister ist doof")).not.toThrowError();
  expect(HttpURL.parse("der meister ist doof").is_err()).toBeTruthy();
});

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
