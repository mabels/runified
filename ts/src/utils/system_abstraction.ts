import { IDMode, RandomMode, SysAbstraction, Time, TimeMode } from "../types";

class SysTime extends Time {
  Now(): Date {
    return new Date();
  }
  Sleep(duration: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, duration);
    });
  }
}

export class ConstTime extends Time {
  Now(): Date {
    return new Date(2021, 1, 1, 0, 0, 0, 0);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Sleep(duration: number): Promise<void> {
    return Promise.resolve();
  }
}

export class StepTime extends Time {
  _step: Date;
  constructor() {
    super();
    this._step = new ConstTime().Now();
  }
  Now() {
    if (this._step.getTime() === 0) {
      this._step = new ConstTime().Now();
      return this._step;
    }
    this._step = new Date(this._step.getTime() + 1000);
    return this._step;
  }
  Sleep(duration: number): Promise<void> {
    this._step = new Date(this._step.getTime() + duration);
    return Promise.resolve();
  }
}

export function TimeFactory(timeMode: TimeMode): Time {
  switch (timeMode) {
    case TimeMode.REAL:
      return new SysTime();
    case TimeMode.CONST:
      return new ConstTime();
    case TimeMode.STEP:
      return new StepTime();
  }
  return new SysTime();
}

const decoder = new TextDecoder();

export class RandomService {
  readonly _mode: RandomMode;
  _step: number = 0;
  constructor(mode: RandomMode) {
    this._mode = mode;
  }
  Random0ToValue(value: number): number {
    switch (this._mode) {
      case RandomMode.CONST:
        return 0.5 * value;
      case RandomMode.STEP:
        this._step += 0.0001;
        return this._step * value;
      case RandomMode.RANDOM:
        return Math.random() * value;
    }
  }
}

export interface SystemAbstractionImplParams {
  readonly TimeMode?: TimeMode;
  readonly IdMode?: IDMode;
  readonly Stdout?: WritableStream;
  readonly RandomMode?: RandomMode;
  readonly SigIntHandler?: () => void;
  readonly SigTermHandler?: () => void;
  readonly SigQuitHandler?: () => void;
}

export class IdService {
  readonly _mode: IDMode;
  _step: number = 0;
  constructor(mode?: IDMode) {
    if (!mode) {
      mode = IDMode.UUID;
    }
    this._mode = mode;
  }
  NextId(): string {
    switch (this._mode) {
      case IDMode.UUID:
        return crypto.randomUUID();
      case IDMode.CONST:
        return "VeryUniqueID";
      case IDMode.STEP:
        return `STEPId-${this._step++}`;
    }
  }
}

export class SystemAbstractionImpl implements SysAbstraction {
  static readonly _time = new SysTime();
  static readonly _stdout = new WritableStream({
    write(chunk) {
      return new Promise((resolve) => {
        const decoded = decoder.decode(chunk);
        console.log(decoded.trimEnd());
        resolve();
      });
    },
  });
  static readonly _idService = new IdService();
  static readonly _randomService = new RandomService(RandomMode.RANDOM);
  static readonly _sigIntHandler = () => {}
  static readonly _sigQuitHandler = () => {}
  static readonly _sigTermHandler = () => {}
  static readonly _closeHandler = () => {}

  readonly _time: Time = SystemAbstractionImpl._time;
  readonly _stdout: WritableStream = SystemAbstractionImpl._stdout;
  readonly _idService: IdService = SystemAbstractionImpl._idService;
  readonly _randomService: RandomService = SystemAbstractionImpl._randomService;
  readonly _sigTermHandler: () => void = SystemAbstractionImpl._sigTermHandler;
  readonly _sigIntHandler: () => void = SystemAbstractionImpl._sigIntHandler;
  readonly _sigQuitHandler: () => void = SystemAbstractionImpl._sigQuitHandler;
  readonly _closeHandler: () => void = SystemAbstractionImpl._closeHandler;

  constructor(params?: SystemAbstractionImplParams) {
    if (params) {
      if (params.TimeMode) {
        this._time = TimeFactory(params.TimeMode);
      }
      if (params.Stdout) {
        this._stdout = params.Stdout;
      }
      if (params.IdMode) {
        this._idService = new IdService(params.IdMode);
      }
      if (params.RandomMode) {
        this._randomService = new RandomService(params.RandomMode);
      }
      if (params.SigIntHandler) {
        this._sigIntHandler = params.SigIntHandler;
      }
      if (params.SigQuitHandler) {
        this._sigQuitHandler = params.SigQuitHandler;
      }
      if (params.SigTermHandler) {
        this._sigTermHandler = params.SigTermHandler;
      }
      if (params.SigTermHandler) {
        this._closeHandler = params.SigTermHandler;
      }
    }
  }

  Time(): Time {
    return this._time;
  }
  NextId(): string {
    return this._idService.NextId();
  }
  Random0ToValue(value: number): number {
    return this._randomService.Random0ToValue(value);
  }
  Stdout(): WritableStream {
    return this._stdout;
  }
  OnClose(fn: () => void): void {
    process.on("close", fn);
  }
  OnSigInt(fn: () => void): void {
    process.on("SIGINT", fn);
  }
  OnSigTerm(fn: () => void): void {
    process.on("SIGTERM", fn);
  }
  OnSigQuit(fn: () => void): void {
    process.on("SIGQUIT", fn);
  }
}
