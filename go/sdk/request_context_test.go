package sdk

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/mabels/runified/testutils"
	"github.com/mabels/runified/types"
	"github.com/stretchr/testify/assert"
)

func TestRequestContextErrorStatusCode(t *testing.T) {
	sdk := NewSdkClient(SdkClientParams{
		BaseUrl: "http://localhost:8080",
		Client: testutils.NewMockHttpClient(http.Response{
			StatusCode: 4711,
		}),
	})
	_, rctx := postWithRequestContext[entities_runified.runifiedData](sdk.(*client), "/test", &entities_runified.runifiedDataReq{},
		func(rc *types.RequestContext, b []byte) (*entities_runified.runifiedData, error) {
			my := &entities_runified.runifiedData{}
			err := json.Unmarshal(b, my)
			return my, err
		})
	if rctx.Error == nil {
		t.Error("Error is nil")
	}
	if rctx.Error.(types.ErrSdkHttpRequestFailed).Response.StatusCode != 4711 {
		t.Error("StatusCode is wrong")
	}

}

func TestRequestContextMarshalError(t *testing.T) {
	sdk := NewSdkClient(SdkClientParams{
		BaseUrl: "http://localhost:8080",
		Client: testutils.NewMockHttpClient(http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(strings.NewReader("{-}")),
		}),
	})
	_, rctx := postWithRequestContext[entities_runified.runifiedData](sdk.(*client), "/test", &entities_runified.runifiedDataReq{},
		func(rc *types.RequestContext, b []byte) (*entities_runified.runifiedData, error) {
			my := &entities_runified.runifiedData{}
			err := json.Unmarshal(b, my)
			return my, err
		})
	if rctx.Error == nil {
		t.Error("Error is nil")
	}
	_, ok := rctx.Error.(*json.SyntaxError)
	if !ok {
		t.Error("Wrong error type")
	}

}

func TestRequestContextOK(t *testing.T) {
	sys := testutils.NewSysAbstraction("step")
	body := entities_runified.runifiedData{
		runifiedDataReq: entities_runified.runifiedDataReq{},
		CreatedAt:  sys.Time().Now(),
	}
	resBodyBytes, _ := json.Marshal(body)

	reqBodyBytes, _ := json.Marshal(&entities_runified.runifiedDataReq{})

	sdk := NewSdkClient(SdkClientParams{
		BaseUrl: "http://localhost:8080",
		Client: testutils.NewMockHttpClient(http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(bytes.NewReader(resBodyBytes)),
		}),
		Sys: sys,
	})
	runified, rctx := postWithRequestContext[entities_runified.runifiedData](sdk.(*client), "/test", &entities_runified.runifiedDataReq{},
		func(rc *types.RequestContext, b []byte) (*entities_runified.runifiedData, error) {
			my := &entities_runified.runifiedData{}
			err := json.Unmarshal(b, my)
			return my, err
		})
	if rctx.Error != nil {
		t.Error(rctx.Error)
	}
	assert.Equal(t, entities_runified.runifiedData{
		runifiedDataReq: entities_runified.runifiedDataReq{},
		CreatedAt:  runified.CreatedAt, // this is set by the server
	}, *runified)

	if rctx.RequestId != rctx.Response.Header.Get("X-Request-ID") {
		t.Error("RequestId is empty")
	}
	if rctx.Duration != 2*time.Second {
		t.Error("RequestId is empty")
	}
	if string(rctx.Stats.Request.Bytes) != string(reqBodyBytes) {
		t.Error("Stats.Request.Bytes is empty")
	}
	if rctx.Stats.Request.Length < uint64(len(reqBodyBytes)) {
		t.Error("Stats.Response.Length is empty")
	}
	if rctx.Stats.Request.Duration() != time.Second {
		t.Error("Stats.Request.Time is empty")
	}

	if string(rctx.Stats.Response.Bytes) != string(resBodyBytes) {
		t.Error("Stats.Request.Bytes is empty")
	}
	if rctx.Stats.Response.Length < uint64(len(resBodyBytes)) {
		t.Error("Stats.Response.Length is empty")
	}
	if rctx.Stats.Response.Duration() != time.Second {
		t.Error("Stats.Request.Time is empty")
	}

	if rctx.Stats.Request.Duration()+rctx.Stats.Response.Duration() != rctx.Duration {
		t.Error("Stats.Request.Time is empty")
	}

}
