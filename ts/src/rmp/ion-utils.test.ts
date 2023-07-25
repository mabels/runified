import { makeBinaryWriter, makeReader } from "ion-js";
import { readObject, writeObject } from "./ion-utils";

it("ion writeObject Number", () => {
  const writer = makeBinaryWriter();
  writeObject(writer, 1);
  writer.close();
  const bytes = writer.getBytes();
  const reader = makeReader(bytes);
  const refObj = readObject(reader);
  expect(refObj).toEqual(1);
});

it("ion writeObject String", () => {
  const writer = makeBinaryWriter();
  writeObject(writer, "hello");
  writer.close();
  const bytes = writer.getBytes();
  const reader = makeReader(bytes);
  const refObj = readObject(reader);
  expect(refObj).toEqual("hello");
});

it("ion writeObject Boolean", () => {
  [true, false].forEach((b) => {
    const writer = makeBinaryWriter();
    writeObject(writer, b);
    writer.close();
    const bytes = writer.getBytes();
    const reader = makeReader(bytes);
    const refObj = readObject(reader);
    expect(refObj).toEqual(b);
  });
});

it("ion writeObject Blob", () => {
  const b = new Uint8Array([1, 2, 3, 4, 5]);
  const writer = makeBinaryWriter();
  writeObject(writer, b);
  writer.close();
  const bytes = writer.getBytes();
  const reader = makeReader(bytes);
  const refObj = readObject(reader) as Uint8Array;
  expect(refObj.length).toEqual(b.length);
  expect(refObj).toEqual(b);
});

const nativeTypeObj = {
  a: 1,
  b: "string",
  bb: true,
  c: [1, 2, 3],
  d: ["1", "2", "3"],
  db: [true, false, true],
  f: Uint8Array.from([1, 2, 3]),
  g: [Uint8Array.from([1, 2, 3]), Uint8Array.from([4, 5, 6])],
};

it("ion writeObject empty Array", () => {
  const writer = makeBinaryWriter();
  writeObject(writer, []);
  writer.close();
  const bytes = writer.getBytes();
  const reader = makeReader(bytes);
  const refObj = readObject(reader);
  expect(refObj).toEqual([]);
});

it("ion writeObject Array", () => {
  const writer = makeBinaryWriter();
  writeObject(writer, [1, 2, 3]);
  writer.close();
  const bytes = writer.getBytes();
  const reader = makeReader(bytes);
  const refObj = readObject(reader);
  expect(refObj).toEqual([1, 2, 3]);
});

it("ion writeObject Object", () => {
  const writer = makeBinaryWriter();
  writeObject(writer, { a: 1, b: 2 });
  writer.close();
  const bytes = writer.getBytes();
  const reader = makeReader(bytes);
  const refObj = readObject(reader);
  expect(refObj).toEqual({ a: 1, b: 2 });
});

it("ion writeObject empty Array", () => {
  const writer = makeBinaryWriter();
  writeObject(writer, {});
  writer.close();
  const bytes = writer.getBytes();
  const reader = makeReader(bytes);
  const refObj = readObject(reader);
  expect(refObj).toEqual({});
});

it("ion writeObject Simple", () => {
  const writer = makeBinaryWriter();
  writeObject(writer, nativeTypeObj);
  writer.close();
  const bytes = writer.getBytes();
  const reader = makeReader(bytes);
  const refObj = readObject(reader);
  expect(refObj).toEqual(nativeTypeObj);
});

it("ion writeObject Complex", () => {
  const writer = makeBinaryWriter();
  const complexTypeObj = {
    ...nativeTypeObj,
    a: [nativeTypeObj, nativeTypeObj, nativeTypeObj],
    b: {
      a: nativeTypeObj,
      b: [nativeTypeObj, nativeTypeObj, nativeTypeObj],
    },
  };
  const testObj = {
    ...complexTypeObj,
    a: [complexTypeObj, complexTypeObj, complexTypeObj],
    b: {
      a: complexTypeObj,
      b: [complexTypeObj, complexTypeObj, complexTypeObj],
    },
  };
  writeObject(writer, testObj);
  writer.close();
  const bytes = writer.getBytes();
  const reader = makeReader(bytes);
  const refObj = readObject(reader);
  expect(refObj).toEqual(testObj);
});
