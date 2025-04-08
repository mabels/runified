import { fromNodeJS } from "./nodejs-headers.js";

it("NodeJS HttpHeaders", () => {
  const nh = {
    a: "b",
    b: ["b", "c"],
  };

  const ah = fromNodeJS(nh);
  expect(Array.from(ah.keys())).toEqual(["a", "b"]);
  expect(Array.from(ah.entries())).toEqual([
    ["a", "b"],
    ["b", "b, c"],
  ]);
});
