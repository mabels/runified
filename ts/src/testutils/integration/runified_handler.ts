import { RunifiedReq } from "../../generated/runifiedreq.js";
import { RunifiedRes, RunifiedResFactory } from "../../generated/runifiedres.js";
import { APIMsg } from "../../types/app/index.js";

export async function RunifiedHandler(api: APIMsg<RunifiedReq, RunifiedRes>): Promise<boolean> {
  api.Log().Debug().Msg("Enter-RunifiedHandler");
  const req = await api.RequestMsg();
  api.Log().Debug().Any("req", req).Msg("Req-RunifiedHandler");

  const res = RunifiedResFactory.Builder().Coerce({
    collectionAddress: req.collectionAddress,
    contract: req.contract,
    createdAt: api.Api().App().Sys().Time().Now(),
    id: req.id,
    price: {
      amount: req.price.amount,
    },
    source: {
      name: req.source.name,
    },
    tokenId: req.tokenId,
  });
  if (res.is_err()) {
    api.Log().Error().Err(res.unwrap_err()).Msg("Res-RunifiedHandler");
    return false;
  }
  await api.WriteMsg(RunifiedResFactory.ToObject(res.unwrap()));
  return true;
}
