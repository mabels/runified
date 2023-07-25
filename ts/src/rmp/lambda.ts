import { EnvelopeCtx, MatchState } from "./envelope-handler";
import { Envelope } from "./envelope-processor";
import { awslambdaTransform } from "./network/awslambda-transformer";
import { awslambdastreamTransform } from "./network/awslambdastream-transformer";
import { RMProtocol } from "./rmp-protocol";

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
    eh.close();
  }, 1000);
  // eh.onClose((fp, eh) => {
  //   eh.close();
  // });
});

export const handler = awslambdaTransform(rmp);

export const streamHandler = awslambdastreamTransform(rmp);
