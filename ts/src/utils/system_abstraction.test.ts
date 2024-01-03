import { TimeMode, IDMode, RandomMode } from "../types";
import { SystemAbstractionImpl } from "./system_abstraction";
import { fork } from "child_process";

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

it("sigint", () => {
  const subProcess = fork("./dist/utils/system_abstraction.sample.js", [], { silent: true });
    subProcess.on('exit', (code) => {
  console.log(`child process exited with code ${code}`);
});
  subProcess.on('message', (message) => {
    console.log(`I get this from the son : ${message}`);
  });
    if(subProcess.stdout)
    subProcess.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    })
  subProcess.send("hello");
    let killed = false;
  setTimeout(() => {
    killed = subProcess.kill("SIGINT"); 
  }, 2000);
  console.log('signalCode', subProcess.signalCode)
  console.log('connected', subProcess.connected)
    console.log('killed', killed)
  expect(killed).toEqual(true);
  expect(subProcess.signalCode).toEqual('SIGINT');
});

it("sigterm", () => {
  const subProcess = fork("./dist/utils/system_abstraction.sample.js", [], { silent: true, stdio: 'inherit' });
  subProcess.on('message', (message) => {
    console.log(`I get this from the son : ${message}`);
  });
  subProcess.send("hello");
  const killed = subProcess.kill("SIGTERM");
    expect(killed).toEqual(true);
  expect(subProcess.signalCode).toEqual('SIGTERM');
});

it("sigquit", () => {
  const subProcess = fork("./dist/utils/system_abstraction.sample.js", [], { silent: true });
  subProcess.on('message', (message) => {
    console.log(`I get this from the son : ${message}`);
  });
  subProcess.send("hello");
  const killed = subProcess.kill("SIGQUIT");
    expect(killed).toEqual(true);
  expect(subProcess.signalCode).toEqual('SIGQUIT');
});
