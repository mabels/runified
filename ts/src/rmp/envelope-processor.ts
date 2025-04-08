import { IonTypes, Writer } from "ion-js";
// import { BinaryWriter } from "ion-js/dist/commonjs/es6/IonBinaryWriter";
// import { Writeable } from "ion-js/dist/commonjs/es6/IonWriteable";
// import { BinaryReader } from "ion-js/dist/commonjs/es6/IonBinaryReader";
// import { BinarySpan } from "ion-js/dist/commonjs/es6/IonSpan";
import { ensureWriter } from "./ion-utils.js";
import { SysAbstraction } from "@adviser/cement";
import { NodeSysAbstraction } from "@adviser/cement/node";

export interface Payload {
  readonly Type: string;
  readonly Data: Uint8Array;
}

export interface ParamEnvelopeWithoutPayload {
  readonly Version?: string;
  readonly Src?: string;
  readonly Dst?: string;
  readonly Time?: number /* regional 32Bit Timestamp ascending */;
  readonly TTL?: number;
}

export interface ParamEnvelope extends ParamEnvelopeWithoutPayload {
  readonly Payload: Payload;
}

export interface Envelope {
  readonly Version: symbol;
  readonly Src: string;
  readonly Dst: string;
  readonly Time: number /* regional 32Bit Timestamp ascending */;
  readonly TTL: number;
  readonly Payload: Payload;
}

// function readPayload(this: Reader): Payload {
//   return ensureReader(this, (r) => {
//     r.stepIn();
//     const ret = {
//       Type: readStringTuple(r, "Type"),
//       Data: readBlobTuple(r, "Data"),
//     };
//     r.stepOut();
//     return ret;
//   });
// }

// function readPayloadTuple(reader: Reader, fieldName: string): Payload {
//   return readTuple(reader, fieldName, readPayload);
// }

// function readVersionTuple(reader: Reader, fieldName: string): Symbol {
//   const vBytes = readTuple(reader, fieldName, reader.byteValue);
//   if (vBytes.length !== 1) {
//     throw Error("version must be a single byte");
//   }
//   return Symbol.for(String.fromCharCode(vBytes[0]));
// }

// const envelopePayloadSymbols = (function () {
//   // Never Change this order or names
//   const envelopeV1Table = new SharedSymbolTable("Envelope", 1, ["Version", "Src", "Dst", "Time", "TTL", "Payload"]);
//   const payloadV1Table = new SharedSymbolTable("Payload", 1, ["Data", "Type"]);
//   const importEnvelopeV1Table = new Import(null, envelopeV1Table);
//   const importEnvelopeV1PayloadTable = new Import(importEnvelopeV1Table, payloadV1Table);
//   const catalog = new Catalog();
//   catalog.add(envelopeV1Table);
//   catalog.add(payloadV1Table);
//   return {
//     catalog,
//     symbolType: new LocalSymbolTable(importEnvelopeV1PayloadTable),
//   };
// })();

export class PayloadEncoder implements Payload {
  readonly Type: string;
  readonly Data: Uint8Array;
  constructor(payload: Payload) {
    this.Type = payload.Type;
    this.Data = payload.Data;
  }
  writeIon = (writer: Writer) => {
    writer.stepIn(IonTypes.STRUCT);
    writer.writeFieldName("Type");
    writer.writeString(this.Type);
    writer.writeFieldName("Data");
    writer.writeBlob(this.Data);
    writer.stepOut();
  };
  asIon(writer?: Writer): Uint8Array {
    return ensureWriter(writer, this.writeIon).getBytes();
  }
}

export class EnvelopeEncoder implements Envelope {
  readonly Version: symbol;
  readonly Src: string;
  readonly Dst: string;
  readonly Time: number /* regional 32Bit Timestamp ascending */;
  readonly TTL: number;
  readonly Payload: PayloadEncoder;
  constructor(env: ParamEnvelope, sys: SysAbstraction) {
    this.Version = Symbol.for(env.Version || "A");
    this.Src = env.Src || "";
    this.Dst = env.Dst || "";
    this.Time = env.Time || sys.Time().Now().getTime();
    this.TTL = env.TTL || 10;
    this.Payload = new PayloadEncoder(env.Payload);
  }
  asIon(writer?: Writer): Uint8Array {
    return ensureWriter(writer, (writer) => {
      writer.stepIn(IonTypes.STRUCT);
      writer.writeFieldName("Version");
      const version = new Uint8Array(1);
      version[0] = (Symbol.keyFor(this.Version) || "A").charCodeAt(0);
      writer.writeBlob(version);
      writer.writeFieldName("Src");
      writer.writeString(this.Src);
      writer.writeFieldName("Dst");
      writer.writeString(this.Dst);
      writer.writeFieldName("Time");
      writer.writeInt(this.Time);
      writer.writeFieldName("TTL");
      writer.writeInt(this.TTL);
      writer.writeFieldName("Payload");
      this.Payload.asIon(writer);
      writer.stepOut();
    }).getBytes();
  }
}

// function makeEnvelopeReader(bytes: Uint8Array) {
//   // return new BinaryReader(new BinarySpan(bytes), envelopePayloadSymbols.catalog);
//   return makeReader(bytes);
// }

export class EnvelopeProcessor {
  _sys: SysAbstraction;

  constructor(sys?: SysAbstraction) {
    this._sys = sys ?? NodeSysAbstraction();
  }

  create(env: ParamEnvelope): EnvelopeEncoder {
    return new EnvelopeEncoder(env, this._sys);
  }
}
