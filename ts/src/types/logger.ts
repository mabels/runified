export interface LoggerInterface<R> {
  Str(key: string, value: string): R;
  Error(): R;
  Err(err: Error): R;
  Info(): R;
  Timestamp(): R;
  Any(key: string, value: unknown): R;
  Dur(key: string, nsec: number): R;
  Uint64(key: string, value: number): R;
}
export interface WithLogger extends LoggerInterface<WithLogger> {
  Logger(): Logger;
}

export interface Logger extends LoggerInterface<Logger> {
  With(): WithLogger;

  Msg(...args: string[]): void;
  Flush(): Promise<void>;
}
