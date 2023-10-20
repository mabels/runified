import { TimeMode } from "../types";
import { DurationUnit, ValueType } from "../types/stats";
import { DateRange, DateRangeAvg, Stats, renderUnitForMs } from "./stats";
import { SystemAbstractionImpl } from "./system_abstraction";

it("stats empty", () => {
  const stats = new Stats();
  expect(stats._feature).toEqual("");
});

it("stats with feature", () => {
  const stats = new Stats("feature");
  expect(stats._feature).toEqual("feature");
});

it("stats nest feature", () => {
  const stats = new Stats("feature");
  expect(stats._feature).toEqual("feature");
  const stat2 = new Stats({ ...stats.AsStatParam(), feature: "level2" });
  expect(stat2._feature).toEqual("feature/level2");
  const stat3 = new Stats({ ...stat2.AsStatParam(), feature: "level3" });
  expect(stat3._feature).toEqual("feature/level2/level3");
});

it("set value", () => {
  const stats = new Stats().Feature("feature");
  stats.ValueSum("value", 1);
  expect(stats._stats).toEqual({
    "/feature#value": [
      {
        _value: 1,
      },
    ],
  });
});

it("set action", async () => {
  const stats = new Stats({
    sys: new SystemAbstractionImpl({
      TimeMode: TimeMode.STEP,
    }),
  }).Feature("feature");
  const res = await stats.Action("value", async () => {
    await new Promise((resolve) => setTimeout(resolve, 24));
    return 24;
  });
  expect(res).toEqual(24);
  const myT = new SystemAbstractionImpl({
    TimeMode: TimeMode.STEP,
  });
  expect(stats._stats).toEqual({
    "/feature#value": [
      {
        _range: {
          start: myT.Time().Now(),
          end: myT.Time().Now(),
        },
      },
    ],
  });
});

it("it renders value", () => {
  const l1 = new Stats({
    sys: new SystemAbstractionImpl({
      TimeMode: TimeMode.STEP,
    }),
  }).Feature("l1");
  const l2 = l1.Feature("l2");

  l1.ValueSum("v1", 42);
  l1.ValueSum("v2", 42.2);
  l2.ValueSum("x1", 42.3);
  l2.ValueSum("x2", 42.4);

  expect(l1.RenderCurrent()).toEqual({
    "/l1#v1": 42,
    "/l1#v2": 42.2,
    "/l1/l2#x1": 42.3,
    "/l1/l2#x2": 42.4,
  });

  l1.ValueSum("v1", 43);
  l1.ValueSum("v2", 43.2);
  l2.ValueSum("x1", 43.3);
  l2.ValueSum("x2", 43.4);

  expect(l1.RenderCurrent()).toEqual({
    "/l1#v1": 43,
    "/l1#v2": 43.2,
    "/l1/l2#x1": 43.3,
    "/l1/l2#x2": 43.4,
  });

  expect(l1.RenderHistory()).toEqual({
    "/l1#v1": [42, 43],
    "/l1#v2": [42.2, 43.2],
    "/l1/l2#x1": [42.3, 43.3],
    "/l1/l2#x2": [42.4, 43.4],
  });

  const r1 = l1.RenderReduced();

  expect(r1).toEqual({
    "/l1/l2#x1": {
      current: {
        val: 85.6,
        cnt: 2,
      },
      total: {
        val: 85.6,
        cnt: 2,
      },
    },
    "/l1/l2#x2": {
      current: {
        val: 85.8,
        cnt: 2,
      },
      total: {
        val: 85.8,
        cnt: 2,
      },
    },
    "/l1#v1": {
      current: {
        val: 85,
        cnt: 2,
      },
      total: {
        val: 85,
        cnt: 2,
      },
    },
    "/l1#v2": {
      current: {
        val: 85.4,
        cnt: 2,
      },
      total: {
        val: 85.4,
        cnt: 2,
      },
    },
  });
});

it("it renders single log action", async () => {
  const l1 = new Stats({
    sys: new SystemAbstractionImpl({
      TimeMode: TimeMode.STEP,
    }),
  }).Feature("l1");
  const l2 = l1.Feature("l2");

  const myT = new SystemAbstractionImpl({
    TimeMode: TimeMode.STEP,
  });

  l1.AddItem("v1", new DateRange(myT.Time().Now(), myT.Time().Now()));
  l1.AddItem("v2", new DateRange(myT.Time().Now(), myT.Time().Now()));
  l2.AddItem("x1", new DateRange(myT.Time().Now(), myT.Time().Now()));
  l2.AddItem("x2", new DateRange(myT.Time().Now(), myT.Time().Now()));

  const e1 = {
    "/l1#v1": {
      unit: "ms",
      val: 1000,
    },
    "/l1#v2": {
      unit: "ms",
      val: 1000,
    },
    "/l1/l2#x1": {
      unit: "ms",
      val: 1000,
    },
    "/l1/l2#x2": {
      unit: "ms",
      val: 1000,
    },
  };

  const double = () => {
    myT.Time().Now();
    return myT.Time().Now();
  };
  expect(l1.RenderCurrent()).toEqual(e1);
  l1.AddItem("v1", new DateRange(myT.Time().Now(), double()));
  l1.AddItem("v2", new DateRange(myT.Time().Now(), double()));
  l2.AddItem("x1", new DateRange(myT.Time().Now(), double()));
  l2.AddItem("x2", new DateRange(myT.Time().Now(), double()));
  const e2 = {
    "/l1#v1": {
      unit: "ms",
      val: 2000,
    },
    "/l1#v2": {
      unit: "ms",
      val: 2000,
    },
    "/l1/l2#x1": {
      unit: "ms",
      val: 2000,
    },
    "/l1/l2#x2": {
      unit: "ms",
      val: 2000,
    },
  };
  expect(l1.RenderCurrent()).toEqual(e2);

  expect(l1.RenderHistory()).toEqual(
    [e1, e2].reduce(
      (a, b: Record<string, DurationUnit>) => {
        for (const key in b) {
          if (!a[key]) {
            a[key] = [];
          }
          a[key].push(b[key]);
        }
        return a;
      },
      {} as Record<string, DurationUnit[]>,
    ),
  );

  const r1 = l1.RenderReduced();

  expect(r1).toEqual({
    "/l1/l2#x1": {
      current: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 3000,
        },
      },
      total: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 3000,
        },
      },
    },
    "/l1/l2#x2": {
      current: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 3000,
        },
      },
      total: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 3000,
        },
      },
    },
    "/l1#v1": {
      current: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 3000,
        },
      },
      total: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 3000,
        },
      },
    },
    "/l1#v2": {
      current: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 3000,
        },
      },
      total: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 3000,
        },
      },
    },
  });
});

it("it renders single time avg action", async () => {
  const l1 = new Stats({
    sys: new SystemAbstractionImpl({
      TimeMode: TimeMode.STEP,
    }),
  }).Feature("l1");
  const l2 = l1.Feature("l2");

  const myT = new SystemAbstractionImpl({
    TimeMode: TimeMode.STEP,
  });

  l1.AddItem("v1", new DateRangeAvg(myT.Time().Now(), myT.Time().Now()));
  l1.AddItem("v2", new DateRangeAvg(myT.Time().Now(), myT.Time().Now()));
  l1.ValueAvg("w1", 42.2);
  l2.AddItem("x1", new DateRangeAvg(myT.Time().Now(), myT.Time().Now()));
  l2.AddItem("x2", new DateRangeAvg(myT.Time().Now(), myT.Time().Now()));
  l2.ValueAvg("w2", 43.2);

  // const e1 = {
  //   "/l1#v1": {
  //     unit: "ms",
  //     val: 1000,
  //   },
  //   "/l1#v2": {
  //     unit: "ms",
  //     val: 1000,
  //   },
  //   "/l1#w1": 42.2,
  //   "/l1#w2": 43.2,
  //   "/l1/l2#x1": {
  //     unit: "ms",
  //     val: 1000,
  //   },
  //   "/l1/l2#x2": {
  //     unit: "ms",
  //     val: 1000,
  //   },
  // };

  l1.Reset();

  const double = () => {
    myT.Time().Now();
    return myT.Time().Now();
  };
  expect(l1.RenderCurrent()).toEqual({});

  l1.AddItem("v1", new DateRangeAvg(myT.Time().Now(), double()));
  l1.AddItem("v2", new DateRangeAvg(myT.Time().Now(), double()));
  l1.ValueAvg("w1", 44.2);

  l2.AddItem("x1", new DateRangeAvg(myT.Time().Now(), double()));
  l2.AddItem("x2", new DateRangeAvg(myT.Time().Now(), double()));
  l2.ValueAvg("w2", 45.2);
  const e2 = {
    "/l1#v1": {
      unit: "ms",
      val: 2000,
    },
    "/l1#v2": {
      unit: "ms",
      val: 2000,
    },
    "/l1#w1": 44.2,
    "/l1/l2#w2": 45.2,
    "/l1/l2#x1": {
      unit: "ms",
      val: 2000,
    },
    "/l1/l2#x2": {
      unit: "ms",
      val: 2000,
    },
  };
  expect(l1.RenderCurrent()).toEqual(e2);

  expect(l1.RenderHistory()).toEqual(
    [e2].reduce(
      (a, b: Record<string, ValueType>) => {
        for (const key in b) {
          if (!a[key]) {
            a[key] = [];
          }
          a[key].push(b[key]);
        }
        return a;
      },
      {} as Record<string, ValueType[]>,
    ),
  );

  const r1 = l1.RenderReduced();

  expect(r1).toEqual({
    "/l1/l2#x1": {
      current: {
        cnt: 1,
        val: {
          unit: "ms",
          val: 2000,
        },
      },
      total: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 1500,
        },
      },
    },
    "/l1/l2#x2": {
      current: {
        cnt: 1,
        val: {
          unit: "ms",
          val: 2000,
        },
      },
      total: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 1500,
        },
      },
    },
    "/l1#v1": {
      current: {
        cnt: 1,
        val: {
          unit: "ms",
          val: 2000,
        },
      },
      total: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 1500,
        },
      },
    },
    "/l1#v2": {
      current: {
        cnt: 1,
        val: {
          unit: "ms",
          val: 2000,
        },
      },
      total: {
        cnt: 2,
        val: {
          unit: "ms",
          val: 1500,
        },
      },
    },
    "/l1#w1": {
      current: {
        cnt: 1,
        val: 44.2,
      },
      total: {
        cnt: 2,
        val: 43.2,
      },
    },
    "/l1/l2#w2": {
      current: {
        cnt: 1,
        val: 45.2,
      },
      total: {
        cnt: 2,
        val: 44.2,
      },
    },
  });
});

it("it renders total and resets", async () => {
  const l1 = new Stats().Feature("l1");
  const myT = new SystemAbstractionImpl({
    TimeMode: TimeMode.STEP,
  });
  const double = () => {
    myT.Time().Now();
    return myT.Time().Now();
  };

  l1.ValueSum("v1", 42);
  l1.ValueSum("v1", 49);
  l1.ValueSum("v1", 47);
  l1.AddItem("t1", new DateRange(myT.Time().Now(), double()));
  l1.AddItem("t1", new DateRange(myT.Time().Now(), double()));
  l1.AddItem("t1", new DateRange(myT.Time().Now(), double()));

  l1.Reset();

  l1.ValueSum("v1", 52);
  l1.ValueSum("v1", 59);
  l1.ValueSum("v1", 57);
  l1.AddItem("t1", new DateRange(myT.Time().Now(), double()));
  l1.AddItem("t1", new DateRange(myT.Time().Now(), double()));
  l1.AddItem("t1", new DateRange(myT.Time().Now(), double()));

  expect(l1.RenderReduced()).toEqual({
    "/l1#t1": {
      current: {
        val: {
          unit: "ms",
          val: 6000,
        },
        cnt: 3,
      },
      total: {
        val: {
          val: 12000,
          unit: "ms",
        },
        cnt: 6,
      },
    },
    "/l1#v1": {
      current: {
        val: 168,
        cnt: 3,
      },
      total: {
        val: 306,
        cnt: 6,
      },
    },
  });

  l1.Reset();
  expect(l1.RenderReduced()).toEqual({});

  l1.ValueSum("v1", 47);
  l1.AddItem("t1", new DateRange(myT.Time().Now(), double()));
  expect(l1.RenderReduced()).toEqual({
    "/l1#t1": {
      current: {
        val: {
          unit: "ms",
          val: 2000,
        },
        cnt: 1,
      },
      total: {
        val: {
          val: 14000,
          unit: "ms",
        },
        cnt: 7,
      },
    },
    "/l1#v1": {
      current: {
        val: 47,
        cnt: 1,
      },
      total: {
        val: 353,
        cnt: 7,
      },
    },
  });
});

it("renderUnitForMs", () => {
  expect(renderUnitForMs(0)).toEqual({ unit: "ns", val: 0 });
  expect(renderUnitForMs(100)).toEqual({ unit: "ms", val: 100 });
  expect(renderUnitForMs(0.01)).toEqual({ unit: "us", val: 10 });
  expect(renderUnitForMs(0.00001)).toEqual({ unit: "ns", val: 10 });
  expect(renderUnitForMs(10000)).toEqual({ unit: "s", val: 10 });
  expect(renderUnitForMs(24 * 60 * 60 * 3 * 1000)).toEqual({ unit: "s", val: 259200 });
});
