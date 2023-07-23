package testutils

import (
	"net/http"

	types_app "github.com/mabels/runified/types/app"
	"github.com/rs/zerolog"
)

type MockApiHandler[Q any, S any] struct {
	ApiRef types_app.API
	LogRef *zerolog.Logger

	Res          *MockResponseWriter
	Req          *http.Request
	LastError    error
	ResponseData *S
	RequestData  *Q
}

func NewMockApiHandler[Q any, S any](cfg *types_app.CLIConfig, mh *MockApiHandler[Q, S]) *MockApiHandler[Q, S] {
	api := NewMockApi(cfg)
	log := api.Log().With().Str("MockApiHandler", "MockApiHandler").Str("requestId", mh.RequestId())
	if mh.Req != nil && mh.Req.URL != nil {
		log.Str("requestPath", mh.Req.URL.Path)
	}

	mh.ApiRef = api
	logRef := log.Logger()
	mh.LogRef = &logRef

	mh.Res = NewMockResponseWriter()
	return mh
}

// type MockApiHandlerUntyped MockApiHandler[struct{}, struct{}]

func (m *MockApiHandler[Q, S]) Log() *zerolog.Logger {
	return m.LogRef
}

func (m *MockApiHandler[Q, S]) Api() types_app.API {
	return m.ApiRef
}
func (api *MockApiHandler[Q, S]) RequestId() string {
	return "test"
}
func (api *MockApiHandler[Q, S]) Response() http.ResponseWriter {
	return api.Res
}
func (api *MockApiHandler[Q, S]) Request() *http.Request {
	return api.Req
}
func (api *MockApiHandler[Q, S]) ErrorMsg(err error) {
	api.LastError = err
}

func (api *MockApiHandler[Q, S]) WriteMsg(res *S) {
	api.Response().WriteHeader(200)
	api.ResponseData = res
}

func (api *MockApiHandler[Q, S]) RequestMsg() (*Q, error) {
	return api.RequestData, nil
}
