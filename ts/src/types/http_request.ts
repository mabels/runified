import { Result } from "@adviser/result";
import { HttpHeader } from "./http_header";

export class HttpURLSearchParams {
  readonly _urlSearchParams: URLSearchParams;
  constructor(refInit: URLSearchParams) {
    this._urlSearchParams = refInit;
  }
  /**
   * Append a new name-value pair to the query string.
   */
  Append(name: string, value: string): void {
    this._urlSearchParams.append(name, value);
  }

  /**
   * If `value` is provided, removes all name-value pairs
   * where name is `name` and value is `value`..
   *
   * If `value` is not provided, removes all name-value pairs whose name is `name`.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Delete(name: string, value?: string): void {
    this._urlSearchParams.delete(name);
  }
  /**
   * Returns an ES6 `Iterator` over each of the name-value pairs in the query.
   * Each item of the iterator is a JavaScript `Array`. The first item of the `Array`is the `name`, the second item of the `Array` is the `value`.
   *
   * Alias for `urlSearchParams[@@iterator]()`.
   */
  Entries(): IterableIterator<[string, string]> {
    return this._urlSearchParams.entries();
  }
  /**
   * Iterates over each name-value pair in the query and invokes the given function.
   *
   * ```js
   * const myURL = new URL('https://example.org/?a=b&#x26;c=d');
   * myURL.searchParams.forEach((value, name, searchParams) => {
   *   console.log(name, value, myURL.searchParams === searchParams);
   * });
   * // Prints:
   * //   a b true
   * //   c d true
   * ```
   * @param fn Invoked for each name-value pair in the query
   * @param thisArg To be used as `this` value for when `fn` is called
   */
  ForEach<TThis = this>(
    callback: (this: TThis, value: string, name: string, searchParams: URLSearchParams) => void,
    thisArg?: TThis,
  ): void {
    return this._urlSearchParams.forEach(callback, thisArg);
  }
  /**
   * Returns the value of the first name-value pair whose name is `name`. If there
   * are no such pairs, `null` is returned.
   * @return or `null` if there is no name-value pair with the given `name`.
   */
  Get(name: string): string | null {
    return this._urlSearchParams.get(name);
  }
  /**
   * Returns the values of all name-value pairs whose name is `name`. If there are
   * no such pairs, an empty array is returned.
   */
  GetAll(name: string): string[] {
    return this._urlSearchParams.getAll(name);
  }
  /**
   * Checks if the `URLSearchParams` object contains key-value pair(s) based on`name` and an optional `value` argument.
   *
   * If `value` is provided, returns `true` when name-value pair with
   * same `name` and `value` exists.
   *
   * If `value` is not provided, returns `true` if there is at least one name-value
   * pair whose name is `name`.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Has(name: string, value?: string): boolean {
    return this._urlSearchParams.has(name);
  }
  /**
   * Returns an ES6 `Iterator` over the names of each name-value pair.
   *
   * ```js
   * const params = new URLSearchParams('foo=bar&#x26;foo=baz');
   * for (const name of params.keys()) {
   *   console.log(name);
   * }
   * // Prints:
   * //   foo
   * //   foo
   * ```
   */
  Keys(): IterableIterator<string> {
    return this._urlSearchParams.keys();
  }
  /**
   * Sets the value in the `URLSearchParams` object associated with `name` to`value`. If there are any pre-existing name-value pairs whose names are `name`,
   * Set the first such pair's value to `value` and remove all others. If not,
   * append the name-value pair to the query string.
   *
   * ```js
   * const params = new URLSearchParams();
   * params.append('foo', 'bar');
   * params.append('foo', 'baz');
   * params.append('abc', 'def');
   * console.log(params.toString());
   * // Prints foo=bar&#x26;foo=baz&#x26;abc=def
   *
   * params.Set('foo', 'def');
   * params.Set('xyz', 'opq');
   * console.log(params.toString());
   * // Prints foo=def&#x26;abc=def&#x26;xyz=opq
   * ```
   */
  Set(name: string, value: string): void {
    this._urlSearchParams.set(name, value);
  }
  /**
   * The total number of parameter entries.
   * @since v19.8.0
   */
  get size(): number {
    return this._urlSearchParams.size;
  }
  /**
   * Sort all existing name-value pairs in-place by their names. Sorting is done
   * with a [stable sorting algorithm](https://en.wikipedia.org/wiki/Sorting_algorithm#Stability), so relative order between name-value pairs
   * with the same name is preserved.
   *
   * This method can be used, in particular, to increase cache hits.
   *
   * ```js
   * const params = new URLSearchParams('query[]=abc&#x26;type=search&#x26;query[]=123');
   * params.sort();
   * console.log(params.toString());
   * // Prints query%5B%5D=abc&#x26;query%5B%5D=123&#x26;type=search
   * ```
   * @since v7.7.0, v6.13.0
   */
  Sort(): void {
    this._urlSearchParams.sort();
  }
  /**
   * Returns the search parameters serialized as a string, with characters
   * percent-encoded where necessary.
   */
  toString(): string {
    return this._urlSearchParams.toString();
  }
  /**
   * Returns an ES6 `Iterator` over the values of each name-value pair.
   */
  Values(): IterableIterator<string> {
    return this._urlSearchParams.values();
  }
}

export class HttpURL {
  readonly _url: URL;

  private constructor(url: URL) {
    this._url = url;
  }

  static join(...parts: string[]): string {
    return parts.join("/").replace(/\/+/g, "/");
  }

  static parse(url: string | HttpURL | URL | Result<HttpURL>, base?: string): Result<HttpURL> {
    if (Result.Is(url)) {
      url = url.unwrap();
    }
    try {
      if (url instanceof HttpURL) {
        return Result.Ok(new HttpURL(new URL(url._url)));
      }
      return Result.Ok(new HttpURL(new URL(url, base)));
    } catch (e) {
      return Result.Err(e as Error);
    }
  }
  Query(): URLSearchParams {
    return this._url.searchParams;
  }
  get Scheme(): string {
    return this._url.protocol;
  }
  SetScheme(scheme: string) {
    this._url.protocol = scheme;
  }
  get Href(): string {
    return this._url.href;
  }
  SetHref(href: string) {
    this._url.href = href;
  }
  get Origin(): string {
    return this._url.origin;
  }
  get Username(): string {
    return this._url.username;
  }
  SetUsername(username: string) {
    this._url.username = username;
  }
  get Password(): string {
    return this._url.password;
  }
  SetPassword(password: string) {
    this._url.password = password;
  }
  get Host(): string {
    return this._url.host;
  }
  SetHost(host: string) {
    this._url.host = host;
  }
  get Hostname(): string {
    return this._url.hostname;
  }
  SetHostname(hostname: string) {
    this._url.hostname = hostname;
  }
  get Path(): string {
    return this._url.pathname;
  }
  SetPath(...parts: string[]) {
    for (let i = 1; i < parts.length; i++) {
      if (parts[i - 1].endsWith("/")) {
        parts[i - 1] = parts[i - 1].slice(0, -1);
      }
      if (parts[i].startsWith("/")) {
        parts[i] = parts[i].slice(1);
      }
    }
    this._url.pathname = parts.join("/");
    return this._url.pathname;
  }
  get Port(): string {
    return this._url.port;
  }
  SetPort(port: string) {
    this._url.port = port;
  }
  get SearchParams(): HttpURLSearchParams {
    return new HttpURLSearchParams(this._url.searchParams);
  }
  get Search(): string {
    return this._url.search;
  }
  SetSearch(search: string) {
    this._url.search = search;
  }
  get Hash(): string {
    return this._url.hash;
  }
  SetHash(hash: string) {
    this._url.hash = hash;
  }

  AsJsURL(): URL {
    return new URL(this._url);
  }

  String(): string {
    return this._url.toString();
  }
  toString(): string {
    return this.String();
  }
}

export type HttpMethods = "GET" | "POST" | "OPTIONS" | "PUT" | "DELETE" | "HEAD";

export function toHttpMethods(m: string): HttpMethods {
  switch (m) {
    case "GET":
    case "POST":
    case "OPTIONS":
    case "PUT":
    case "DELETE":
    case "HEAD":
      return m;
    default:
      throw new Error(`Invalid method: ${m}`);
  }
}

export interface HttpRequestParamBase {
  readonly Method?: HttpMethods;
  readonly URL: HttpURL | string;
  readonly Header?: HttpHeader;
  readonly Body?: ReadableStream<Uint8Array>;
}

export interface HttpGetRequestParam extends HttpRequestParamBase {
  readonly Method: "GET";
  readonly Redirect?: "follow" | "error" | "manual";
}

export type HttpRequestParam = HttpGetRequestParam | HttpRequestParamBase;

export interface HttpRequestBase {
  readonly URL: HttpURL;
  readonly Header: HttpHeader;
  readonly Method: HttpMethods;
  readonly Body?: ReadableStream<Uint8Array>;
}

export interface HttpGetRequest extends HttpRequestBase {
  readonly Method: "GET";
  readonly Redirect?: "follow" | "error" | "manual";
}

export type HttpRequest = HttpGetRequest | HttpRequestBase;

export function DefaultHttpRequest(hp: HttpRequestParam): HttpRequest {
  return {
    ...hp,
    Header: hp.Header || new HttpHeader(),
    URL: HttpURL.parse(hp.URL).unwrap(),
    Method: toHttpMethods(hp.Method || "GET"),
  } as HttpRequest;
}
