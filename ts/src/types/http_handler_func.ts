import { HttpRequest } from "./http_request.js";

import { HttpResponseWriter } from "./http_response_writer.js";

export type HttpHandlerFunc = (w: HttpResponseWriter, r: HttpRequest) => Promise<void>;
