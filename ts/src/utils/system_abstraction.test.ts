import { TimeMode, IDMode, RandomMode } from "../types";
import { SystemAbstractionImpl } from "./system_abstraction";
import { ExecException, exec } from "node:child_process";

it("IdService UUID", () => {
  const sys = new SystemAbstractionImpl();
  const id1 = sys.NextId();
  const id2 = sys.NextId();
  expect(id1).not.toEqual(id2);
});

it("IdService explict UUID", () => {
  const sys = new SystemAbstractionImpl({ IdMode: IDMode.UUID });
  const id1 = sys.NextId();
  const id2 = sys.NextId();
  expect(id1).not.toEqual(id2);
});

it("IdService const", () => {
  const sys = new SystemAbstractionImpl({ IdMode: IDMode.CONST });
  const id1 = sys.NextId();
  const id2 = sys.NextId();
  expect(id1).toEqual(id2);
});

it("IdService set", () => {
  for (let i = 0; i < 10; i++) {
    const sys = new SystemAbstractionImpl({ IdMode: IDMode.STEP });
    const id1 = sys.NextId();
    const id2 = sys.NextId();
    expect(id1).toEqual("STEPId-0");
    expect(id2).toEqual("STEPId-1");
  }
});

it("time sleep", async () => {
  const sys = new SystemAbstractionImpl();
  const start = sys.Time().Now();
  await sys.Time().Sleep(100);
  expect(sys.Time().TimeSince(start)).toBeGreaterThan(90);
});

it("time sleep const", async () => {
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.REAL });
  const start = new Date();
  await sys.Time().Sleep(100);
  const end = new Date();
  expect(end.getTime() - start.getTime()).toBeGreaterThan(90);
});

it("time sleep step", async () => {
  const sys = new SystemAbstractionImpl({ TimeMode: TimeMode.STEP });
  const start = sys.Time().Now();
  await sys.Time().Sleep(86400500);
  expect(sys.Time().Now().getTime() - start.getTime()).toEqual(86401500);
});

it("const random", () => {
  const sys = new SystemAbstractionImpl({ RandomMode: RandomMode.CONST });
  expect(sys.Random0ToValue(10)).toEqual(5);
  expect(sys.Random0ToValue(10)).toEqual(5);
});

it("step random", () => {
  const sys = new SystemAbstractionImpl({ RandomMode: RandomMode.STEP });
  expect(sys.Random0ToValue(10000)).toEqual(1);
  expect(sys.Random0ToValue(10000)).toEqual(2);
});

it("random", () => {
  const sys = new SystemAbstractionImpl({});
  for (let i = 0; i < 100; i++) {
    const val = sys.Random0ToValue(10);
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThanOrEqual(10);
  }
});

function exitHandler(errCode: number, larg: string, done: () => void) {
  return (err: ExecException | null, stdout: string | Buffer, stderr: string | Buffer) => {
    if (err) {
      expect(err.code).toBe(errCode);
    }
    if (stdout) {
      const res = stdout
        .toString()
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          const out = JSON.parse(line);
          return out;
        })
        .map((obj) => {
          delete obj.pid;
          return obj;
        });
      expect(res).toEqual([
        {
          larg: larg,
        },
        {
          larg: larg,
          msg: "Called OnExit 1",
        },
        {
          larg: larg,
          msg: "Called OnExit 2",
        },
      ]);
      done();
    }
    if (stderr) {
      expect(stderr).toEqual({});
    }
  };
}

it("just-exit", (done) => {
  exec("ts-node src/utils/test-exit-handler.ts exit24", exitHandler(24, "exit24", done));
});

it("throw", (done) => {
  exec("ts-node src/utils/test-exit-handler.ts throw", exitHandler(19, "throw", done));
});

it("via sigint", (done) => {
  exec("ts-node src/utils/test-exit-handler.ts sigint", exitHandler(2, "sigint", done));
});

it("via sigterm", (done) => {
  exec("ts-node src/utils/test-exit-handler.ts sigterm", exitHandler(9, "sigterm", done));
});

it("via sigquit", (done) => {
  exec("ts-node src/utils/test-exit-handler.ts sigquit", exitHandler(3, "sigquit", done));
});
