export type ValueType = number | string | DateTuple | DurationUnit;

export interface UnitValue {
  readonly val: ValueType;
  readonly unit?: string;
}

export type ValueWithUnit = UnitValue & { readonly cnt: number }

export type ValueWithCount =  ValueWithUnit  | number;

export interface ResultType {
  readonly current: ValueWithCount;
  readonly total: ValueWithCount;
}

export interface ActionItem {
  // ToString(): string;
  Value(): ValueType;
  // Reduce(items: ActionItem[]): ValueType;
  Avg(val: ValueType, cnt: number): ValueType;
  Sum(items: ActionItem[], val?: ValueType): ValueType;
  Render(vt: ValueType): ValueWithCount;
}

export interface DurationUnit {
  readonly val: number;
  readonly unit: string;
}

export interface DateTuple {
  readonly start: Date;
  readonly end: Date;
}
