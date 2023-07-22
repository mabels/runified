import { TimeMode } from "../sys_abstraction";

export interface AddrPort {
  readonly Port: number;
  readonly Addr?: string;
}

export interface FireBaseConfig {
  readonly DBUrl: string;
  readonly ServiceAccountKeyPath: string;
}

export interface CLIConfigParams {
  readonly AppName: string;
  readonly Listen: AddrPort;
  readonly FireBase: FireBaseConfig;
  readonly KVStoreType: string;
  readonly TimeMode: TimeMode;
}

export class CLIConfig implements CLIConfigParams {
  readonly AppName: string;
  readonly Listen: AddrPort;
  readonly FireBase: FireBaseConfig;
  readonly KVStoreType: string;
  readonly TimeMode: TimeMode;
  constructor(args: CLIConfigParams) {
    this.AppName = args.AppName;
    this.Listen = args.Listen;
    this.FireBase = args.FireBase;
    this.KVStoreType = args.KVStoreType;
    this.TimeMode = args.TimeMode;
  }
}
