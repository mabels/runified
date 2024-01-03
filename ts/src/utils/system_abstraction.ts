import { IDMode, RandomMode, SysAbstraction, Time, TimeMode, VoidFunc } from "../types";

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
  readonly Stdout?: WritableStream<Uint8Array>;
  readonly Stderr?: WritableStream<Uint8Array>;
  readonly RandomMode?: RandomMode;
  readonly ExitService?: ExitService;
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

interface ExitHandler {
  readonly hdl: VoidFunc;
  readonly id: string;
}

export interface ExitService {
  injectExitHandlers(hdls: ExitHandler[]): void;
  exit(code: number): void;
}

export class ExitServiceImpl implements ExitService {
  constructor() {
    // import( 'exit-hook').then(({ asyncExitHook, gracefulExit }) => {
    //   asyncExitHook(this._handleExit, { wait: 2000 });
    //   this.gracefulExit = gracefulExit;
    // }).catch((err) => {
    //   console.error("ExitService: failed to import exit-hook", err)
    // })
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    process.on("unhandledRejection", (reason: string, p: Promise<unknown>) => {
      // console.error('Unhandled Rejection at:', p, 'reason:', reason);
      this.exit(19);
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    process.on("uncaughtException", (error: Error) => {
      // console.error(`Caught exception: ${error}\n` + `Exception origin: ${error.stack}`);
      this.exit(18);
    });
    // function handle() {
    //   for (let i = 0; i < 100; i++) {
    //     setImmediate(() => { });
    //   }
    //   setTimeout(handle, 1000);
    // }
    // setTimeout(handle, 1000);
    process.on("exit", () => {
      // console.log("ExitService: EXIT");
      this.exit(0);
    });
    process.on("SIGQUIT", () => {
      // console.log("ExitService: SIGQUIT");
      this.exit(3);
    });
    process.on("SIGINT", () => {
      // console.log("ExitService: SIGINT");
      this.exit(2);
    });
    process.on("SIGTERM", () => {
      // console.log("ExitService: SIGTERM");
      this.exit(9);
    });
    // exitHook(signal => {
    //   console.log(`Exiting with signal: ${signal}`);
    // });
  }
  _exitHandlers: ExitHandler[] = [];
  injectExitHandlers(hdls: ExitHandler[]): void {
    // console.log("ExitService: injecting exit handlers", hdls)
    this._exitHandlers = hdls;
  }
  invoked = false;
  readonly _handleExit = async (): Promise<void> => {
    if (this.invoked) {
      // console.error("ExitService: already invoked");
      return;
    }
    this.invoked = true;
    for (const h of this._exitHandlers) {
      try {
        // console.log(`ExitService: calling handler ${h.id}`)
        const ret = h.hdl();
        // console.log(`ExitService: called handler ${h.id}`, ret)
        if (typeof (ret as Promise<void>).then === "function") {
          await ret;
        }
      } finally {
        // ignore
      }
    }
  };

  exit(code: number): void {
    // console.log("ExitService: exit called", code)
    this._handleExit()
      .then(() => {
        process.exit(code);
      })
      .catch((err) => {
        console.error("ExitService: failed to handle exit", err);
        process.exit(code);
      });
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
  static readonly _stderr = new WritableStream({
    write(chunk) {
      return new Promise((resolve) => {
        const decoded = decoder.decode(chunk);
        console.error(decoded.trimEnd());
        resolve();
      });
    },
  });

  static readonly _idService = new IdService();
  static readonly _exitService = new ExitServiceImpl();
  static readonly _randomService = new RandomService(RandomMode.RANDOM);

  readonly _time: Time = SystemAbstractionImpl._time;
  readonly _stdout: WritableStream = SystemAbstractionImpl._stdout;
  readonly _stderr: WritableStream = SystemAbstractionImpl._stderr;
  readonly _idService: IdService = SystemAbstractionImpl._idService;
  readonly _randomService: RandomService = SystemAbstractionImpl._randomService;
  readonly _exitService: ExitService = SystemAbstractionImpl._exitService;

  constructor(params?: SystemAbstractionImplParams) {
    if (params) {
      if (params.TimeMode) {
        this._time = TimeFactory(params.TimeMode);
      }
      if (params.Stdout) {
        this._stdout = params.Stdout;
      }
      if (params.Stderr) {
        this._stderr = params.Stderr;
      }
      if (params.IdMode) {
        this._idService = new IdService(params.IdMode);
      }
      if (params.RandomMode) {
        this._randomService = new RandomService(params.RandomMode);
      }
      if (params.ExitService) {
        this._exitService = params.ExitService;
      }
    }
    this._exitService.injectExitHandlers(SystemAbstractionImpl._exitHandlers);
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
  Stderr(): WritableStream {
    return this._stderr;
  }
  static readonly _exitHandlers: ExitHandler[] = [];
  OnExit(hdl: VoidFunc): VoidFunc {
    const id = crypto.randomUUID();
    SystemAbstractionImpl._exitHandlers.push({ hdl, id });
    return () => {
      const idx = SystemAbstractionImpl._exitHandlers.findIndex((h) => h.id === id);
      if (idx >= 0) {
        SystemAbstractionImpl._exitHandlers.splice(idx, 1);
      }
    };
  }
  Exit(code: number): void {
    this._exitService.exit(code);
  }
}
