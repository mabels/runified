declare module "@fnproject/fdk" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  declare function handle(handler: (ctx: Context, input: any) => Promise<any>): void;
}
// export default fdk;
