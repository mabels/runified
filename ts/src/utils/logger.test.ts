import { LoggerImpl } from "./logger";
import { LogCollector } from "../testutils";

import { Logger, TimeMode } from "../types";
import { SystemAbstractionImpl, TimeFactory } from "./system_abstraction";

describe("TestLogger", () => {
  let logCollector: LogCollector;
  let logger: Logger;

  beforeEach(() => {
    logCollector = new LogCollector();
    logger = new LoggerImpl({
      out: logCollector,
      sys: new SystemAbstractionImpl({ TimeMode: TimeMode.STEP }),
    });
  });

  describe("Error()", () => {
    it("should set the level attribute to error", async () => {
      logger.Error().Msg("");
      await logger.Flush();
      expect(logCollector.Logs()).toEqual([{ level: "error", msg: "" }]);
    });

    it("should set the error message", async () => {
      logger.Err(new Error("test")).Msg("");
      await logger.Flush();
      expect(logCollector.Logs()).toEqual([{ error: "test", msg: "" }]);
    });
  });

  describe("Info()", () => {
    it("should set the level attribute to info", async () => {
      logger.Info().Msg("");
      await logger.Flush();
      expect(logCollector.Logs()).toEqual([{ level: "info", msg: "" }]);
    });
  });

  describe("Any()", () => {
    it("should set the Any attribute", async () => {
      logger.Any("key", "value").Msg("");
      await logger.Flush();
      expect(logCollector.Logs()).toEqual([{ key: "value", msg: "" }]);
    });
  });

  describe("Dur()", () => {
    it("should set the Dur attribute", async () => {
      logger.Dur("key", 123).Msg("");
      await logger.Flush();
      expect(logCollector.Logs()).toEqual([{ key: 123, msg: "" }]);
    });
  });
  describe("Uint64()", () => {
    it("should set the Uint64 / number attribute", async () => {
      logger.Uint64("Hey", 123).Msg("");
      await logger.Flush();
      expect(logCollector.Logs()).toEqual([{ Hey: 123, msg: "" }]);
    });
  });
  describe("Str()", () => {
    it("should set the String attribute", async () => {
      logger.Str("key", "value").Msg("");
      await logger.Flush();
      expect(logCollector.Logs()).toEqual([{ key: "value", msg: "" }]);
    });
  });

  describe("With()", () => {
    it("should return a new logger with the same attributes", async () => {
      const log = logger.With().Str("key", "value").Logger();
      const newLogger = log.With().Str("str", "str").Logger();
      logger.Msg("logger1");
      logger.Msg("logger2");
      newLogger.Msg("newLogger1");
      newLogger.Msg("newLogger2");

      log.Info().Msg("log1");
      log.Info().Msg("log2");
      await log.Flush();

      expect(logCollector.Logs()).toEqual([
        { msg: "logger1" },
        { msg: "logger2" },
        { key: "value", msg: "newLogger1", str: "str" },
        { key: "value", msg: "newLogger2", str: "str" },
        { level: "info", key: "value", msg: "log1" },
        { level: "info", key: "value", msg: "log2" },
      ]);
    });
  });

  describe("Timestamp()", () => {
    it("should set the Timestamp attribute", async () => {
      const WithConstant = logger.With().Str("key", "withconstant").Str("key1", "anotherone").Logger();
      const timelog = WithConstant.With().Timestamp().Str("key", "withconstant2").Logger();
      timelog.Msg("1");
      timelog.Msg("2");
      timelog.Timestamp().Msg("3");

      await timelog.Flush();
      const timer = TimeFactory(TimeMode.STEP);

      expect(logCollector.Logs()).toEqual([
        {
          key: "withconstant2",
          key1: "anotherone",
          ts: timer.Now().toISOString(),
          msg: "1",
        },
        {
          key: "withconstant2",
          key1: "anotherone",
          ts: timer.Now().toISOString(),
          msg: "2",
        },
        {
          key: "withconstant2",
          key1: "anotherone",
          ts: timer.Now().toISOString(),
          msg: "3",
        },
      ]);
    });

    it("should NOT set the Timestamp attribute", async () => {
      const timelog = logger.With().Logger();
      timelog.Msg("1");
      timelog.Msg("2");
      timelog.Timestamp().Msg("3");

      await timelog.Flush();
      const timer = TimeFactory(TimeMode.STEP);

      expect(logCollector.Logs()).toEqual([
        { msg: "1" },
        { msg: "2" },
        {
          ts: timer.Now().toISOString(),
          msg: "3",
        },
      ]);
    });
  });
});