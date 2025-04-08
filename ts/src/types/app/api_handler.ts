import { Logger } from "@adviser/cement";
import { Api } from "./api.js";
import { CtxHandler } from "./ctx_handler.js";

export interface ApiHandler extends CtxHandler {
  Log(): Logger; // *zerolog.Logger
  Api(): Api;

  ErrorMsg<T>(err: T | Error): Promise<number>;
}

export interface APIMsg<REQ, RES> extends ApiHandler {
  WriteMsg(data: RES): Promise<number>;
  RequestMsg(): Promise<REQ>;
}

export type ApiHandlerTyped<REQ, RES> = (api: APIMsg<REQ, RES>) => Promise<boolean>;

export type ApiHandlerUnTyped = (api: ApiHandler) => Promise<boolean>;
