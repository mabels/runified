import { MockLogger } from "./logger";

describe("logger", () => {
  it("with logcollector", async () => {
    const l = MockLogger();
    l.logger.Str("bla1", "blub1").Msg("hello1");
    l.logger.Str("bla2", "blub2").Msg("hello2");
    await l.logger.Flush();
    expect(l.logCollector.Logs()).toEqual([
      { bla1: "blub1", msg: "hello1" },
      { bla2: "blub2", msg: "hello2" },
    ]);
  });
});
