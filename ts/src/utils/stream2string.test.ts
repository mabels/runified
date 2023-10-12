import { stream2string } from "./stream2string";

it("stream2string", async () => {
  expect(
    await stream2string(
      new ReadableStream({
        start(controller): void {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode("Hello"));
          controller.enqueue(encoder.encode(" "));
          controller.enqueue(encoder.encode("World"));
          controller.enqueue(encoder.encode("!"));
          controller.close();
        },
      }),
    ),
  ).toBe("Hello World!");
});
