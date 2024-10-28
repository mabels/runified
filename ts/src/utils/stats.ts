import { SysAbstraction } from "@adviser/cement";
import { NodeSysAbstraction } from "@adviser/cement/node";
import {
  ActionItem,
  DateTuple,
  DurationUnit,
  ResultType,
  UnitValue,
  ValueType,
  ValueWithCount,
  ValueWithUnit,
} from "../types/stats";

export function renderUnitForMs(valMS: number): UnitValue {
  if (valMS < 1) {
    const us = valMS * 1000;
    if (1 <= us && us < 1000) {
      return { val: Math.round(us), unit: "us" };
    }
    const ns = valMS * 1000 * 1000;
    return { val: Math.round(ns), unit: "ns" };
  }
  valMS = Math.round(valMS);
  if (1 <= valMS && valMS < 1000) {
    return { val: valMS, unit: "ms" };
  }
  return { val: Math.round(valMS / 1000), unit: "s" };
}

export class DateRange implements ActionItem {
  readonly _range: DateTuple;
  _cnt: number = 1;
  constructor(start: Date, end: Date) {
    this._range = { start, end };
  }
  Value(): DateTuple {
    return this._range;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Avg(val: ValueType, cnt: number): ValueType {
    this._cnt = cnt;
    return val;
  }
  Sum(items: ActionItem[], preset?: ValueType): ValueType {
    let sum = preset ? ~~(preset as DurationUnit).val : 0;
    for (const item of items) {
      sum += (item.Value() as DateTuple).end.getTime() - (item.Value() as DateTuple).start.getTime();
    }
    return { val: sum, unit: "ms" };
  }
  Render(v: ValueType): ValueWithCount {
    const du = v as DurationUnit;
    if (typeof du.val != "number") {
      throw new Error("invalid value");
    }
    return { ...renderUnitForMs(du.val), cnt: this._cnt };
  }
}

export class DateRangeAvg extends DateRange {
  Avg(val: ValueType, cnt: number): ValueType {
    if (cnt === 0) {
      this._cnt = 1;
      return val;
    }
    this._cnt = cnt;
    return { val: (val as DurationUnit).val / cnt, unit: "ms" };
  }
  // Render(v: ValueType): ValueWithCount {
  //   if (!(v instanceof DateRangeAvg)) {
  //     throw new Error("invalid value: DateRangeAvg");
  //   }
  //   return { ...renderUnitForMs(du.val), cnt: this._cnt };
  // }
}

abstract class Value implements ActionItem {
  readonly _value: number;
  _cnt: number = 1;
  constructor(value: number) {
    this._value = value;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Avg(val: ValueType, cnt: number): ValueType {
    this._cnt = cnt;
    return val;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Sum(items: ActionItem[]): ValueType {
    throw new Error("Method not implemented.");
  }
  Value(): number {
    return this._value;
  }
  Render(v: ValueType): ValueWithCount {
    if (typeof v != "number") {
      throw new Error("invalid value");
    }
    if (this._cnt <= 1) {
      return v;
    }
    return { val: v, cnt: this._cnt };
  }
}

export class ValueSum extends Value {
  Sum(items: ActionItem[], preset?: ValueType): ValueType {
    return items.reduce(
      (acc, item) => {
        return acc + (item.Value() as number);
      },
      preset ? (preset as number) : 0,
    );
  }
}

export class ValueAvg extends ValueSum {
  Avg(val: ValueType, cnt: number): ValueType {
    if (cnt === 0) {
      this._cnt = 1;
      return val;
    }
    this._cnt = cnt;
    return (val as number) / cnt;
  }
}

// export class ValueAvg extends Value {
//   Reduce(items: ActionItem[]): ValueType {
//     if (items.length === 0) {
//       return 0;
//     }
//     return (
//       items.reduce((acc, item) => {
//         return acc + (item.Value() as number);
//       }, 0) / items.length
//     );
//   }
// }

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export interface StatsParam {
  readonly feature?: string;
  readonly parent?: Stats;
  readonly sys?: SysAbstraction;
  readonly stats?: Record<string, ActionItem[]>;
  readonly totalStats?: Record<string, Writeable<ValueWithUnit>>;
}

export class Stats {
  readonly _feature: string = "";
  readonly _stats: Record<string, ActionItem[]> = {};
  readonly _totalStats: Record<string, Writeable<ValueWithUnit>> = {};
  readonly _children: Stats[] = [];
  readonly _sys: SysAbstraction = undefined as unknown as SysAbstraction;
  constructor(sp?: StatsParam | string) {
    if (typeof sp === "string") {
      sp = {
        feature: sp,
      };
    } else if (!sp) {
      sp = {};
    }
    if (sp.feature) {
      let feature = sp.feature;
      if (sp.parent) {
        feature = `${sp.parent._feature}/${feature}`;
      }
      this._feature = feature;
    }
    if (sp.stats) {
      this._stats = sp.stats;
    }
    if (sp.totalStats) {
      this._totalStats = sp.totalStats;
    }
    if (sp.sys) {
      this._sys = sp.sys;
    }
    if (!this._sys) {
      this._sys = NodeSysAbstraction();
    }
  }

  AsStatParam(): StatsParam {
    return {
      feature: this._feature,
      parent: this,
      stats: this._stats,
      totalStats: this._totalStats,
      sys: this._sys,
    };
  }

  Reset() {
    for (const child of this._children) {
      child.Reset();
    }
    this._children.splice(0, this._children.length);
    for (const key in this._stats) {
      delete this._stats[key];
    }
  }
  Feature(name: string): Stats {
    const stats = new Stats({
      ...this.AsStatParam(),
      feature: name,
    });
    this._children.push(stats);
    return stats;
  }

  RenderCurrent(): Record<string, ValueWithCount> {
    const ret: Record<string, ValueWithCount> = {};
    for (const key in this._stats) {
      const val = this._stats[key];
      if (val.length) {
        ret[key] = val[0].Render(val[0].Sum([val[val.length - 1]]));
      }
    }
    for (const child of this._children) {
      Object.assign(ret, child.RenderCurrent());
    }
    return ret;
  }

  RenderHistory(): Record<string, ValueWithCount[]> {
    const ret: Record<string, ValueWithCount[]> = {};
    for (const key in this._stats) {
      ret[key] = this._stats[key].map((i) => i.Render(i.Sum([i])));
    }
    return ret;
  }

  RenderReduced(): Record<string, ResultType> {
    const ret: Record<string, ResultType> = {};

    for (const key in this._stats) {
      const keyItem = this._stats[key][0];
      if (!keyItem) {
        continue;
      }
      if (!ret[key]) {
        ret[key] = {
          current: {} as ValueWithCount,
          total: {
            val: {} as ValueType,
            cnt: 0,
          },
        };
      }
      const ts = this._totalStats[key];
      ret[key] = {
        current: keyItem.Render(keyItem.Avg(keyItem.Sum(this._stats[key]), this._stats[key].length)),
        total: keyItem.Render(keyItem.Avg(ts.val, ts.cnt || 1)),
      };
    }
    // for (const child of this._children) {
    //   Object.assign(ret, child.RenderReduced());
    // }
    return ret;
  }

  AddItem(name: string, ai: ActionItem) {
    const key = `${this._feature}#${name}`;
    let item = this._stats[key];
    if (!item) {
      item = [];
      this._stats[key] = item;
    }
    item.push(ai);
    if (!this._totalStats[key]) {
      this._totalStats[key] = {
        val: undefined as unknown as ValueType,
        cnt: 0,
      };
    }
    // if (typeof this._totalStats[key] === 'number') {
    //   this._totalStats[key] = {
    //     val: this._totalStats[key] as number,
    //     cnt: 1,
    //   };
    // }
    const ts = this._totalStats[key] as Writeable<ValueWithUnit>;
    ts.cnt = (ts.cnt || 0) + 1;
    ts.val = ai.Sum([ai], ts.val);
  }

  async Action<T>(name: string, action: () => Promise<T>): Promise<T> {
    const start = this._sys.Time().Now();
    const result = await action();
    const end = this._sys.Time().Now();
    this.AddItem(name, new DateRangeAvg(start, end));

    return Promise.resolve(result);
  }

  ValueSum(name: string, val: number): Stats {
    this.AddItem(name, new ValueSum(val));
    return this;
  }
  ValueAvg(name: string, val: number): Stats {
    this.AddItem(name, new ValueAvg(val));
    return this;
  }
}
