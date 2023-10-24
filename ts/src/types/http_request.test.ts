import { HttpURL } from "./http_request";

it('test from string', () => {
    const url = HttpURL.parse("http://localhost:8080/abc/def?m=1&n=2").unwrap().AsJsURL();
    expect(url.protocol).toBe("http:");
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe("8080");
    expect(url.pathname).toBe("/abc/def");
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({ m: "1", n: "2" });

})

it('test from object', () => {
    const inner = HttpURL.parse("http://localhost:8080/abc/def?m=1&n=2")
    const url = HttpURL.parse(inner).unwrap().AsJsURL( );
    inner.Ok().SetPath("/dkdkdkd");
    expect(url.protocol).toBe("http:");
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe("8080");
    expect(url.pathname).toBe("/abc/def");
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({ m: "1", n: "2" });

})


it('test setPathname', () => {
    const hurl = HttpURL.parse("http://localhost:8080/abc/def?m=1&n=2").unwrap()
    hurl.SetPath("bla/", "/bli", "bl//ub")
    const url = hurl.AsJsURL( );
    expect(url.protocol).toBe("http:");
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe("8080");
    expect(url.pathname).toBe("/bla/bli/bl//ub");
    hurl.SetPath("//////bla/", "/bli", "bl//ub")
    expect(hurl.Path).toBe("//////bla/bli/bl//ub");
    expect(Object.fromEntries(url.searchParams.entries())).toEqual({ m: "1", n: "2" });

})
