package types

import (
	"fmt"
	"net/http"
	"time"

)

type Stats struct {
	Length uint64
	Bytes  []byte
	Start  time.Time
	End    time.Time
}

func (s *Stats) Duration() time.Duration {
	return s.End.Sub(s.Start)
}

type RequestContext struct {
	RequestId string
	Request   *http.Request
	Response  *http.Response
	Duration  time.Duration
	Error     error

	Stats struct {
		Request  Stats
		Response Stats
	}
}

type SDKClient interface {
}

type ErrSdkHttpRequestFailed struct {
	Request  http.Request
	Response http.Response
}

func (f ErrSdkHttpRequestFailed) Error() string {
	return fmt.Sprintf("HTTP Response StatusCode is: %v", f.Response.StatusCode)
}
