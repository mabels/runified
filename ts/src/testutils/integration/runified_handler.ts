import { RunifiedReq } from "../../generated/runified_req";
import { RunifiedRes } from "../../generated/runified_res";
import { APIMsg } from "../../types/app";

export async function RunifiedHandler(api: APIMsg<RunifiedReq, RunifiedRes>): Promise<boolean> {
  const req = await api.RequestMsg();

  const res: RunifiedRes = {
    collectionAddress: req.collectionAddress!,
    contract: req.contract!,
    createdAt: api.Api().App().Sys().Time().Now(),
    id: req.id!,
    price: {
      amount: req.price!.amount!,
    },
    source: {
      name: req.source!.name!,
    },
    tokenId: req.tokenId!,
  };
  api.WriteMsg(res);
  return true;
}
