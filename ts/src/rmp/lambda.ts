import { EnvelopeCtx, MatchState } from "./envelope-handler.js";
import { Envelope } from "./envelope-processor.js";
import { awslambdaTransform } from "./network/awslambda-transformer.js";
import { awslambdastreamTransform } from "./network/awslambdastream-transformer.js";
import { RMProtocol } from "./rmp-protocol.js";

const rmp = new RMProtocol();

rmp.onConnect((fp, eh) => {
  eh.send({
    Src: `RMP:${eh.id}`,
    Payload: {
      Type: "Envelope:Transport:Endpoint",
      Data: Uint8Array.from(new TextEncoder().encode(eh.id)),
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  eh.onEnvelope((envelope: Envelope, ctx: EnvelopeCtx) => {
    eh.send({
      Src: `RMP:${eh.id}`,
      Dst: envelope.Src,
      Payload: envelope.Payload,
    });
    return MatchState.Pass;
  });
  setTimeout(() => {
    void eh.close();
  }, 1000);
  // eh.onClose((fp, eh) => {
  //   eh.close();
  // });
});

export const handler = awslambdaTransform(rmp);

export const streamHandler = awslambdastreamTransform(rmp);
