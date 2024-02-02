import { HttpURL } from "./http_url";

describe("HttpURL", () => {
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

  it("query single", () => {
    const hurl = HttpURL.parse("http://localhost:8080/abc/def").unwrap();
    hurl.Query().Set("m", "1");
    hurl.Query().Set("n", "1");
    expect(hurl.String()).toBe("http://localhost:8080/abc/def?m=1&n=1");
  });

  it("query chained", () => {
    const hurl = HttpURL.parse("http://localhost:8080/abc/def").unwrap();
    const q = hurl.Query();
    q.Append("m", "1");
    q.Append("n", "1");
    expect(hurl.String()).toBe("http://localhost:8080/abc/def?m=1&n=1");
  });

  describe("set hostname", () => {
    it("ipv6 literal", () => {
      const hurl = HttpURL.parse("http://localhost:8080/abc/def").unwrap();
      hurl.SetHostname("::");
      expect(hurl.String()).toBe("http://[::]:8080/abc/def");
    });

    it("string literal", () => {
      const hurl = HttpURL.parse("http://localhost:8080/abc/def").unwrap();
      hurl.SetHostname("meno");
      expect(hurl.String()).toBe("http://meno:8080/abc/def");
    });

    it("ipv4 literal", () => {
      const hurl = HttpURL.parse("http://localhost:8080/abc/def").unwrap();
      hurl.SetHostname("1.1.1.1");
      expect(hurl.String()).toBe("http://1.1.1.1:8080/abc/def");
    });
  });
});
