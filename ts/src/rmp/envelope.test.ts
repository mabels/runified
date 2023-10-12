import { SystemAbstractionImpl } from "../utils";
import { TimeMode } from "../types";
import { EnvelopeHandler, MatchState } from "./envelope-handler";
import { FrameProcessor } from "./frame-processor";
import { RMProtocolCtx } from "./rmp-protocol";
import { EnvelopeEncoder } from "./envelope-processor";

describe("Envelope", () => {
  const txtEncoder = new TextEncoder();
  const fp = new FrameProcessor({
    sys: new SystemAbstractionImpl({
      TimeMode: TimeMode.CONST,
    }),
  });

  it("Default", () => {
    const ee = new EnvelopeEncoder(
      {
        Payload: {
          Type: "test",
          Data: txtEncoder.encode("hello"),
        },
      },
      fp.sys,
    );

    const ion = ee.asIon();
    expect(ion.length).toBeGreaterThan(10);
    const eh = new EnvelopeHandler(fp);
    eh.onEnvelope((env) => {
      expect(env.Version).toEqual(Symbol.for("A"));
      expect(env.Src).toEqual("");
      expect(env.Dst).toEqual("");
      expect(env.Time).toBe(fp.sys.Time().Now().getTime());
      expect(env.TTL).toEqual(10);
      expect(env.Payload.Type).toEqual("test");
      expect(env.Payload.Data).toEqual(txtEncoder.encode("hello"));
      return MatchState.Pass;
    });
    eh.match(ion, undefined as unknown as RMProtocolCtx);
  });
  it("FullSet", async () => {
    const ion = new EnvelopeEncoder(
      {
        Version: "B",
        Src: "src",
        Dst: "dst",
        Time: 123,
        TTL: 5,
        Payload: {
          Type: "test",
          Data: txtEncoder.encode("hello"),
        },
      },
      fp.sys,
    ).asIon();
    const eh = new EnvelopeHandler(fp);
    eh.onEnvelope((env) => {
      expect(env.Version).toEqual(Symbol.for("B"));
      expect(env.Src).toEqual("src");
      expect(env.Dst).toEqual("dst");
      expect(env.Time).toEqual(123);
      expect(env.TTL).toEqual(5);
      expect(env.Payload.Type).toEqual("test");
      expect(env.Payload.Data).toEqual(txtEncoder.encode("hello"));
      return MatchState.Pass;
    });
    eh.match(ion, undefined as unknown as RMProtocolCtx);
  });
});

// export {};
