import { MockHttpServer } from "../testutils/http_server";
import { HTTPHandler } from "./http_handler";
import { HttpRequest } from "./http_request";
import { HttpResponseWriter } from "./http_response_writer";

it("DoubleRegister", () => {
  // test 2 same path registers
  const hp = new HTTPHandler({
    HttpServer: new MockHttpServer(),
  });
  let res = hp.RegisterHandler(
    "/hi",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (w: HttpResponseWriter, r: HttpRequest) => {
      return Promise.resolve();
    },
  );
  expect(res.is_ok()).toBeTruthy();

  res = hp.RegisterHandler(
    "/hi",
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (w: HttpResponseWriter, r: HttpRequest) => {
      return Promise.resolve();
    },
  );
  expect(res.is_ok()).toBeFalsy();
});

it("RegisterUnregister", () => {
  // test 2 same path registers
  const hp = new HTTPHandler({
    HttpServer: new MockHttpServer(),
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const hpFN = (w: HttpResponseWriter, r: HttpRequest) => {
    return Promise.resolve();
  };
  let res = hp.RegisterHandler("/hi", hpFN);
  expect(res.is_ok()).toBeTruthy();
  expect(res.unwrap()).toBeTruthy();
  res.unwrap()();
  res.unwrap()();
  res = hp.RegisterHandler("/hi", hpFN);
  expect(res.is_ok()).toBeTruthy();
});
