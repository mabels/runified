import { SysAbstraction } from "../types";
import { ActionItem, DateTuple, ValueType } from "../types/stats";
import { SystemAbstractionImpl } from "./system_abstraction";

export class DateRange implements ActionItem {
  readonly _range: DateTuple;
  constructor(start: Date, end: Date) {
    this._range = { start, end };
  }
  Value(): DateTuple {
    return this._range;
  }
  Reduce(items: ActionItem[]): ValueType {
    if (items.length === 0) {
      return 0;
    }
    let sum = 0;
    for (const item of items) {
      sum += (item.Value() as DateTuple).end.getTime() - (item.Value() as DateTuple).start.getTime();
    }
    return { val: sum / items.length, unit: "ms" };
  }
}

abstract class Value implements ActionItem {
  readonly _value: number;
  constructor(value: number) {
    this._value = value;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Reduce(items: ActionItem[]): ValueType {
    throw new Error("Method not implemented.");
  }
  Value(): number {
    return this._value;
  }
}

export class ValueSum extends Value {
  Reduce(items: ActionItem[]): ValueType {
    return items.reduce((acc, item) => {
      return acc + (item.Value() as number);
    }, 0);
  }
}

export class ValueAvg extends Value {
  Reduce(items: ActionItem[]): ValueType {
    if (items.length === 0) {
      return 0;
    }
    return (
      items.reduce((acc, item) => {
        return acc + (item.Value() as number);
      }, 0) / items.length
    );
  }
}

export class Stats {
  readonly _feature: string = "";
  readonly _stats: Record<string, ActionItem[]> = {};
  readonly _lastStats: Record<string, ActionItem> = {};
  readonly _children: Stats[] = [];
  readonly _sys: SysAbstraction = undefined as unknown as SysAbstraction;
  constructor(feature?: string, stats?: Stats, sys?: SysAbstraction) {
    if (feature) {
      if (stats) {
        feature = `${stats._feature}/${feature}`;
      }
      this._feature = feature;
    }
    if (stats) {
      this._stats = stats._stats;
      this._sys = stats._sys;
    }
    if (sys) {
      this._sys = sys;
    }
    if (!this._sys) {
      this._sys = new SystemAbstractionImpl();
    }
  }
  Feature(name: string): Stats {
    const stats = new Stats(name, this);
    this._children.push(stats);
    return stats;
  }

  RenderCurrent(): Record<string, ValueType> {
    const ret: Record<string, ValueType> = {};
    for (const key in this._lastStats) {
      const val = this._lastStats[key];
      ret[key] = val.Reduce([this._lastStats[key]]);
    }
    for (const child of this._children) {
      Object.assign(ret, child.RenderCurrent());
    }
    return ret;
  }

  RenderHistory(): Record<string, ValueType[]> {
    const ret: Record<string, ValueType[]> = {};
    for (const key in this._stats) {
      ret[key] = this._stats[key].map((i) => i.Reduce([i]));
    }
    return ret;
  }

  RenderReduced(): Record<string, ValueType> {
    const ret: Record<string, ValueType> = {};
    for (const key in this._stats) {
      const keyItem = this._stats[key][0];
      if (!keyItem) {
        continue;
      }
      ret[key] = keyItem.Reduce(this._stats[key]);
    }
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
    this._lastStats[key] = ai;
  }

  async Action<T>(name: string, action: () => Promise<T>): Promise<T> {
    const start = this._sys.Time().Now();
    const result = await action();
    const end = this._sys.Time().Now();
    this.AddItem(name, new DateRange(start, end));

    return Promise.resolve(result);
  }

  Value(name: string, val: number): Stats {
    this.AddItem(name, new ValueSum(val));
    return this;
  }
}
