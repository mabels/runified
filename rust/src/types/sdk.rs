
struct Stats {
	Length: u64,
	Bytes:  Vec<u8>,
	Start:  std::time::Time,
	End:    std::time::Time,
}

impl Stats {
	fn Duration() -> std::time::Duration {
		return s.End.Sub(s.Start)
	}
}

struct RequestStat {
	Stat:  Stats,
	Request:   hyper::Request<hyper::Body>,
}
struct ResponseStat {
	Stat:  Stats,
	Response:  hyper::Response<hyper::Body>,
}

struct RequestContext {
	RequestId: string,
	Duration:  std::time::Duration,
	Error:     Error,

	Request:  RequestStat,
	Response:  ResponseStat,
}

trait SDKClient {
}

// type ErrSdkHttpRequestFailed struct {
// 	Request  http.Request
// 	Response http.Response
// }

// func (f ErrSdkHttpRequestFailed) Error() string {
// 	return fmt.Sprintf("HTTP Response StatusCode is: %v", f.Response.StatusCode)
// }
