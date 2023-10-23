import { array2stream, stream2array, streamMap } from "./stream_map";

it("stream_map", async () => {
  const closeFn = jest.fn();
  const s = await stream2array(
    streamMap(array2stream([1, 2, 3]), {
      Map: (i, idx) => (idx + 1) * 10 + i + 1,
      Close: closeFn,
    }),
  );
  expect(closeFn).toBeCalledTimes(1);
  expect(s).toEqual([12, 23, 34]);
});

it("map types", async () => {
  const oo = await stream2array(
    streamMap(array2stream([1, 2, 3]), {
      Map: (chunk, idx) => {
        return "[" + chunk + "/" + idx + "]";
      },
    }),
  );
  expect(oo).toEqual(["[1/0]", "[2/1]", "[3/2]"]);
});
