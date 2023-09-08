import { TimeMode } from '../types';
import { DurationUnit } from '../types/stats';
import { DateRange, Stats} from './stats';
import { SystemAbstractionImpl } from './system_abstraction';

it("stats empty", () => {
    const stats = new Stats();
    expect(stats._feature).toEqual("");
})

it("stats with feature", () => {
    const stats = new Stats("feature");
    expect(stats._feature).toEqual("feature");
})

it("stats nest feature", () => {
    const stats = new Stats("feature");
    expect(stats._feature).toEqual("feature");
    const stat2 = new Stats("level2", stats);
    expect(stat2._feature).toEqual("feature/level2");
    const stat3 = new Stats("level3", stat2);
    expect(stat3._feature).toEqual("feature/level2/level3");
})

it("set value", () => {
    const stats = new Stats().Feature("feature")
    stats.Value("value", 1)
    expect(stats._stats).toEqual({
        "/feature#value": [
            {
                "_value": 1,
            },
        ],
    })
})

it("set action", async () => {
    const stats = new Stats(undefined, undefined, new SystemAbstractionImpl({
        TimeMode: TimeMode.STEP,
    })).Feature("feature")
    const res = await stats.Action("value", async () => {
        await new Promise((resolve) => setTimeout(resolve, 24))
        return 24
    })
    expect(res).toEqual(24)
    const myT = new SystemAbstractionImpl({
        TimeMode: TimeMode.STEP,
    })
    expect(stats._stats).toEqual({
        "/feature#value": [{
            _range: {
                "start": myT.Time().Now(),
                "end": myT.Time().Now(),
            },
        }],
    })
})

it("it renders value", () => {
    const l1 = new Stats(undefined, undefined, new SystemAbstractionImpl({
        TimeMode: TimeMode.STEP,
    })).Feature("l1")
    const l2 = l1.Feature("l2")

    l1.Value("v1", 42)
    l1.Value("v2", 42.2)
    l2.Value("x1", 42.3)
    l2.Value("x2", 42.4)

    expect(l1.RenderCurrent()).toEqual({
        "/l1#v1": 42,
        "/l1#v2": 42.2,
        "/l1/l2#x1": 42.3,
        "/l1/l2#x2": 42.4,
    })

    l1.Value("v1", 43)
    l1.Value("v2", 43.2)
    l2.Value("x1", 43.3)
    l2.Value("x2", 43.4)

    expect(l1.RenderCurrent()).toEqual({
        "/l1#v1": 43,
        "/l1#v2": 43.2,
        "/l1/l2#x1": 43.3,
        "/l1/l2#x2": 43.4,
    })

    expect(l1.RenderHistory()).toEqual({
        "/l1#v1": [42, 43],
        "/l1#v2": [42.2, 43.2],
        "/l1/l2#x1": [42.3, 43.3],
        "/l1/l2#x2": [42.4, 43.4],
    })

    expect(l1.RenderReduced()).toEqual({
        "/l1#v1": 85,
        "/l1#v2": 85.4,
        "/l1/l2#x1": 85.6,
        "/l1/l2#x2": 85.8,
    })
})

it("it renders single log action", async () => {
    const l1 = new Stats(undefined, undefined, new SystemAbstractionImpl({
        TimeMode: TimeMode.STEP,
    })).Feature("l1")
    const l2 = l1.Feature("l2")

    const myT = new SystemAbstractionImpl({
        TimeMode: TimeMode.STEP,
    });

    l1.AddItem("v1", new DateRange(myT.Time().Now(), myT.Time().Now()))
    l1.AddItem("v2", new DateRange(myT.Time().Now(), myT.Time().Now()))
    l2.AddItem("x1", new DateRange(myT.Time().Now(), myT.Time().Now()))
    l2.AddItem("x2", new DateRange(myT.Time().Now(), myT.Time().Now()))

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
        }
    }

    const double = () => {
        myT.Time().Now()
        return myT.Time().Now()
    }
    expect(l1.RenderCurrent()).toEqual(e1)
    l1.AddItem("v1", new DateRange(myT.Time().Now(), double()))
    l1.AddItem("v2", new DateRange(myT.Time().Now(), double()))
    l2.AddItem("x1", new DateRange(myT.Time().Now(), double()))
    l2.AddItem("x2", new DateRange(myT.Time().Now(), double()))
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

        }
    }
    expect(l1.RenderCurrent()).toEqual(e2);

    expect(l1.RenderHistory()).toEqual([e1, e2].reduce((a, b: Record<string, DurationUnit>) => {
        for (const key in b) {
            if (!a[key]) {
                a[key] = []
            }
            a[key].push(b[key])
        }
        return a
    }, {} as Record<string, DurationUnit[]>))

    expect(l1.RenderReduced()).toEqual({
        "/l1#v1": {
            unit: "ms",
            val: 1500,
        },
        "/l1#v2": {
            unit: "ms",
            val: 1500,

        },
        "/l1/l2#x1": {
            unit: "ms",
            val: 1500,

        },
        "/l1/l2#x2": {
            unit: "ms",
            val: 1500,

        }
    })
})
