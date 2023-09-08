export type ValueType = number | string | DateTuple | DurationUnit;

export interface ActionItem {
  // ToString(): string;
  Value(): ValueType;
  Reduce(items: ActionItem[]): ValueType;
}

export interface DurationUnit {
  readonly val: number;
  readonly unit: string;
}

export interface DateTuple {
  readonly start: Date;
  readonly end: Date;
}
