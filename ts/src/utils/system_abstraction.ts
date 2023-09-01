import { SysAbstraction, Time, TimeMode } from "../types";

class SysTime extends Time {
  Now(): Date {
    return new Date();
  }
}

export class ConstTime extends Time {
  Now(): Date {
    return new Date(2021, 1, 1, 0, 0, 0, 0);
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

export interface SystemAbstractionImplParams {
  readonly TimeMode?: TimeMode;
  readonly Stdout?: WritableStream;
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

  readonly _time: Time = SystemAbstractionImpl._time;
  readonly _stdout: WritableStream = SystemAbstractionImpl._stdout;
  constructor(params?: SystemAbstractionImplParams) {
    if (params) {
      if (params.TimeMode) {
        this._time = TimeFactory(params.TimeMode);
      }
      if (params.Stdout) {
        this._stdout = params.Stdout;
      }
    }
  }

  Time(): Time {
    return this._time;
  }
  Stdout(): WritableStream {
    return this._stdout;
  }
}
