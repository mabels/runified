import { IonType, IonTypes, makeBinaryWriter, makeReader, Reader, Writer } from "ion-js";
import { HttpHeader } from "../types";

export function makeEnvelopeWriter() {
  // return new BinaryWriter(envelopePayloadSymbols.symbolType, new Writeable());
  // return makeTextWriter();
  return makeBinaryWriter();
}

export function ensureWriter(writer: Writer | undefined, actionFn: (writer: Writer) => void): Writer {
  let myWriter = writer;
  if (!myWriter) {
    myWriter = makeEnvelopeWriter();
  }
  actionFn(myWriter);
  if (!writer) {
    myWriter.close();
  }
  return myWriter;
}

export function ensureReader<T>(reader: Reader | Uint8Array, actionFn: (reader: Reader) => T): T {
  let myReader: Reader;
  if (reader instanceof Uint8Array) {
    myReader = makeReader(reader);
    // console.lodumpTextg('ensureReader-1', dumpPrettyText(reader));
  } else {
    myReader = reader;
  }
  return actionFn(myReader);
}

export function readTuple<T>(reader: Reader, fieldName: string, fn: (type: IonType | null) => T | null): T {
  // console.log("readTuple", fieldName);
  const type = reader.next();
  const fname = reader.fieldName();
  if (fname !== fieldName) {
    throw Error(`no ${fieldName} field: ${fname}:${type}`);
  }
  // type = reader.next();
  // console.log("readTuple", fieldName, type);
  const ret = fn.apply(reader, [type]);
  // console.log("readTuple-1", fieldName, ret, type)
  if (ret === null || ret === undefined) {
    throw Error(`no ${fieldName} value found: ${type}`);
  }
  return ret;
}

export function readStringTuple(reader: Reader, fieldName: string): string {
  return readTuple(reader, fieldName, reader.stringValue);
}

export function readNumberTuple(reader: Reader, fieldName: string): number {
  return readTuple(reader, fieldName, reader.numberValue);
}

export function readBlobTuple(reader: Reader, fieldName: string): Uint8Array {
  return readTuple(reader, fieldName, reader.uInt8ArrayValue);
}

export function readBoolTuple(reader: Reader, fieldName: string): boolean {
  return readTuple(reader, fieldName, reader.booleanValue);
}

export function readHeaderTuple(reader: Reader, fieldName: string): HttpHeader {
  return readTuple(reader, fieldName, (type) => {
    // const type = reader.next();
    // console.log('readHeaderTuple-1', type);
    const obj = readObject(reader, type);
    // console.log('readHeaderTuple-2', obj);
    return HttpHeader.from(obj as HeadersInit);
  });
}

export function readObject(reader: Reader, type = reader.next()): unknown {
  // const type = reader.next();
  // console.log('readObject-0', type);
  if (type === null) {
    return null;
  }
  switch (type) {
    case IonTypes.LIST: {
      reader.stepIn();
      const outA = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const val = readObject(reader);
        if (val === null) {
          break;
        }
        outA.push(val);
      }
      reader.stepOut();
      return outA;
    }
    case IonTypes.STRUCT: {
      reader.stepIn();
      // const length = reader.numberValue() || 0
      const outO: Record<string, unknown> = {};
      // for (let i = 0; i < length; ++i) {
      for (let loop: IonType | null = type; loop !== null; loop = reader.next()) {
        const k = reader.fieldName();
        if (k !== null) {
          outO[k] = readObject(reader, loop);
        }
      }
      reader.stepOut();
      return outO;
    }
    case IonTypes.BLOB:
      return reader.uInt8ArrayValue();
    case IonTypes.INT:
      return reader.numberValue();
    case IonTypes.STRING:
      return reader.stringValue();
    case IonTypes.BOOL:
      return reader.booleanValue();
    default:
      throw Error(`Unknown code ${JSON.stringify(type)}`);
  }
}

export function writeObject(writer: Writer, obj: unknown) {
  if (Array.isArray(obj)) {
    // writer.writeInt("A".charCodeAt(0));
    // writer.writeInt(obj.length);
    writer.stepIn(IonTypes.LIST);
    for (const item of obj) {
      writeObject(writer, item);
    }
    writer.stepOut();
  } else if (obj instanceof Uint8Array) {
    // writer.writeInt("B".charCodeAt(0));
    // writer.stepIn(IonTypes.BLOB)
    writer.writeBlob(obj);
    // writer.stepOut()
  } else if (typeof obj === "object") {
    // writer.writeInt("O".charCodeAt(0));
    const array = Array.from(Object.entries(obj || {}));
    // writer.writeInt(array.length);
    writer.stepIn(IonTypes.STRUCT);
    for (const [k, v] of array) {
      writer.writeFieldName(k);
      writeObject(writer, v);
    }
    writer.stepOut();
  } else if (typeof obj === "string") {
    // writer.writeInt("S".charCodeAt(0));
    // writer.stepIn(IonTypes.STRING)
    writer.writeString(obj);
    // writer.stepOut()
  } else if (typeof obj === "number") {
    // writer.writeInt("N".charCodeAt(0));
    // writer.stepIn(IonTypes.INT)
    writer.writeInt(obj);
    // writer.stepOut()
  } else if (typeof obj === "boolean") {
    // writer.writeInt("N".charCodeAt(0));
    // writer.stepIn(IonTypes.INT)
    writer.writeBoolean(obj);
    // writer.stepOut()
  }
}
