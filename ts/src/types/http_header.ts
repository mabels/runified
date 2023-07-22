export class HttpHeader {
  readonly _headers: Map<string, string[]> = new Map<string, string[]>();

  static from(headers?: HeadersInit | NodeJS.Dict<string | string[]>): HttpHeader {
    const h = new HttpHeader();
    if (headers) {
      if (Array.isArray(headers)) {
        for (const [k, v] of headers) {
          if (v) {
            h.Add(k, v);
          }
        }
      } else if (headers instanceof Headers) {
        for (const [k, v] of headers.entries()) {
          if (v) {
            h.Add(
              k,
              v.split(",").map((v) => v.trim())
            );
          }
        }
      } else {
        for (const k in headers) {
          const v = headers[k];
          if (v) {
            h.Add(k, v);
          }
        }
      }
    }
    return h;
  }

  _key(key: string): string {
    return key.toLowerCase();
  }
  Values(key: string): string[] {
    const values = this._headers.get(this._key(key));
    return values || [];
  }
  Get(key: string): string | undefined {
    const values = this._headers.get(this._key(key));
    if (values === undefined || values.length === 0) {
      return undefined;
    }
    return values[0];
  }
  Set(key: string, valueOr: string | string[]): void {
    const value = Array.isArray(valueOr) ? valueOr : [valueOr];
    this._headers.set(this._key(key), value);
  }
  Add(key: string, value: string | string[]): void {
    const vs = Array.isArray(value) ? value : [value];
    const values = this._headers.get(this._key(key));
    if (values === undefined) {
      this._headers.set(this._key(key), vs);
    } else {
      values.push(...vs);
    }
  }
  Del(ey: string): void {
    this._headers.delete(this._key(ey));
  }
  Items(): [string, string[]][] {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return Array.from(this._headers).filter(([_, vs]) => vs.length > 0);
  }
  SortItems(): [string, string[]][] {
    return this.Items().sort(([[a]], [[b]]) => a.localeCompare(b));
  }
  Clone(): HttpHeader {
    const clone = new HttpHeader();
    for (const [key, values] of this._headers.entries()) {
      clone._headers.set(key, values.slice());
    }
    return clone;
  }
  AsObject(): Record<string, string[]> {
    const obj: Record<string, string[]> = {};
    for (const [key, values] of this._headers.entries()) {
      obj[key] = [...values];
    }
    return obj;
  }
  AsHeaderInit(): HeadersInit {
    const obj: HeadersInit = {};
    for (const [key, values] of this._headers.entries()) {
      obj[key] = values[0];
    }
    return obj;
  }
  Merge(other?: HttpHeader): HttpHeader {
    const ret = this.Clone();
    if (other) {
      for (const [key, values] of other.Items()) {
        ret.Add(key, values);
      }
    }
    return ret;
  }
}
