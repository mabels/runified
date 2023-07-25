export async function stream2string(stream?: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!stream) {
    return Promise.resolve("");
  }
  const reader = stream.getReader();
  let res = "";
  const decoder = new TextDecoder();
  // eslint-disable-next-line no-constant-condition
  while (1) {
    try {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      const block = decoder.decode(value, { stream: true });
      res += block;
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return Promise.resolve(res);
}

export async function stream2uint8array(stream?: ReadableStream<Uint8Array> | null): Promise<Uint8Array> {
  if (!stream) {
    return Promise.resolve(new Uint8Array());
  }
  const reader = stream.getReader();
  let res = new Uint8Array();
  // eslint-disable-next-line no-constant-condition
  while (1) {
    try {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      res = new Uint8Array([...res, ...value]);
    } catch (err) {
      return Promise.reject(err);
    }
  }
  return Promise.resolve(res);
}
