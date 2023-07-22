import { HttpRequest } from "./http_request";

import { HttpResponseWriter } from "./http_response_writer";

export type HttpHandlerFunc = (w: HttpResponseWriter, r: HttpRequest) => Promise<void>;
