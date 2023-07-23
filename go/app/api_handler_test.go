package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"testing"

	"github.com/mabels/runified/sdk"
	"github.com/mabels/runified/testutils"
	"github.com/mabels/runified/types"
	types_app "github.com/mabels/runified/types/app"
	"github.com/stretchr/testify/assert"
)

func TestPassOfRequestIdAndApp(t *testing.T) {
	sys := testutils.NewSysAbstraction()
	sdk := NewSdkMockClient(func(api types_app.APIMsg[RunifiedReq, RunifiedRes]) bool {
		reqmsg, _ := api.RequestMsg()
		runifiedData := entities_runified.runifiedData{
			runifiedDataReq: *reqmsg,
			CreatedAt:  api.Api().App().Sys().Time().Now(),
		}

		api.WriteMsg(&runifiedData)
		return true
	},
		func() *entities_runified.runifiedDataReq {
			return &entities_runified.runifiedDataReq{}
		},
	)

	runifiedDataReq := entities_runified.runifiedDataReq{
		CollectionAddress: "0x1234567890",
		Id:                "1",
		Category:          "apitest",
		DummyCategory:     "dummyApitest",
	}

	res, rctx := sdk.AddrunifiedData(runifiedDataReq)
	if rctx.Error != nil {
		t.Errorf("Error reading request message: %v", rctx.Error)
	}

	ref := entities_runified.runifiedData{
		runifiedDataReq: runifiedDataReq,
		CreatedAt:  sys.Time().Now(),
	}
	assert.Equal(t, &ref, res, "Request message data does not match")

}

func TestApiErrorMsg(t *testing.T) {
	lc := testutils.LogCollector{}
	mw := testutils.NewMockResponseWriter()
	mockApi := testutils.NewMockApi(&types_app.CLIConfig{}, &lc)
	hdl := apiHandler[struct{}, struct{}]{
		api:          mockApi,
		requestId:    "wurstapi1",
		logRef:       mockApi.Log(),
		httpResponse: mw,
	}
	hdl.ErrorMsg(fmt.Errorf("test error"))
	logs := lc.Logs()
	if len(logs) != 1 {
		t.Errorf("Expected 1 log entry, got %v", len(lc.Logs()))
	}

	if logs[0]["level"] != "error" {
		t.Errorf("Expected error log level, got %v", logs[0]["Level"])
	}
	if logs[0]["error"] != "test error" {
		t.Errorf("Expected error 'test error', got %v", logs[0]["error"])
	}
	if logs[0]["message"] != "API error" {
		t.Errorf("Expected message 'API error', got %v", logs[0]["message"])
	}
	if mw.StatusCode != http.StatusInternalServerError {
		t.Errorf("Expected status code 500, got %v", mw.StatusCode)
	}
	bytes, err := ioutil.ReadAll(mw.Body)

	if err != nil {
		t.Errorf("Error reading response body: %v", err)
	}
	errMsg := types.ErrorMsg{}
	json.Unmarshal(bytes, &errMsg)

	if errMsg.Status != http.StatusInternalServerError {
		t.Errorf("Expected status code 500, got %v", errMsg.Status)
	}
	if errMsg.RequestId != hdl.RequestId() {
		t.Errorf("Expected request id %v, got %v", hdl.RequestId(), errMsg.RequestId)
	}
	if errMsg.Message != "test error" {
		t.Errorf("Expected message 'test error', got %v", errMsg.Message)
	}

}

func TestWriteMsg(t *testing.T) {
	mockApi := testutils.NewMockApi(&types_app.CLIConfig{})

	runifiedDataReq := entities_runified.runifiedDataReq{
		CollectionAddress: "0x1234567890",
		Id:                "1",
		Category:          "apitest",
		DummyCategory:     "dummyApitest",
	}

	runifiedData := entities_runified.runifiedData{
		runifiedDataReq: runifiedDataReq,
		CreatedAt:  mockApi.AppRef.Sys().Time().Now(),
	}

	mw := testutils.NewMockResponseWriter()

	requestId := "WriteMsgTest"

	hdl := apiHandler[entities_runified.runifiedDataReq, entities_runified.runifiedData]{
		api:          mockApi,
		requestId:    requestId,
		httpResponse: mw,
		requestTypeFactory: func() *entities_runified.runifiedDataReq {
			return &entities_runified.runifiedDataReq{}
		},
	}

	hdl.WriteMsg(&runifiedData)

	if mw.StatusCode != http.StatusOK {
		t.Errorf("Expected status code 200, got %v", mw.StatusCode)
	}
	if mw.Header().Get("Content-Type") != "application/json" {
		t.Errorf("Expected content type 'application/json', got %v", mw.Header().Get("Content-Type"))
	}
	if mw.Header().Get("X-Request-ID") != requestId {
		t.Errorf("Expected request id '%v', got %v", requestId, mw.Header().Get("X-Request-ID"))
	}
	bytes, err := ioutil.ReadAll(mw.Body)
	if err != nil {
		t.Errorf("Error reading response body: %v", err)
	}
	res := entities_runified.runifiedData{}
	json.Unmarshal(bytes, &res)

	assert.Equal(t, runifiedData, res, "Response message data does not match")

}

func TestRequestMessage(t *testing.T) {
	mockApi := testutils.NewMockApi(&types_app.CLIConfig{})

	runifiedDataReq := entities_runified.runifiedDataReq{
		CollectionAddress: "0x1234567890",
		Id:                "1",
		Category:          "apitest",
		DummyCategory:     "dummyApitest",
	}
	marshalledData, err := json.Marshal(runifiedDataReq)
	if err != nil {
		t.Errorf("Error marshalling test data: %v", err)
	}
	var postReq *http.Request
	postReq, err = http.NewRequest("POST", "test://test", bytes.NewBuffer(marshalledData))
	if err != nil {
		t.Errorf("Error creating request: %v", err)
	}

	hdl := apiHandler[entities_runified.runifiedDataReq, entities_runified.runifiedData]{
		api:         mockApi,
		httpRequest: postReq,
		requestTypeFactory: func() *entities_runified.runifiedDataReq {
			return &entities_runified.runifiedDataReq{}
		},
	}

	res, err := hdl.RequestMsg()
	if err != nil {
		t.Errorf("Error reading request message: %v", err)
	}

	assert.Equal(t, &runifiedDataReq, res, "Request message data does not match")

}

func NewSdkMockClient[Q any, S any](handler func(types_app.APIMsg[Q, S]) bool, rtf RequestTypeFactory[Q]) types.SDKClient {
	mockApi := testutils.NewMockApi(&types_app.CLIConfig{})

	wrappedHandler := WrapApiHandler[Q, S](
		mockApi,
		[]types_app.ApiHandlerUnTyped{WrapUntypedApi[Q, S](handler)},
		rtf,
	)

	httpDirect := testutils.MockSdkHttpHandler{
		DirectCall: wrappedHandler,
	}

	client := sdk.NewSdkClient(sdk.SdkClientParams{
		BaseUrl: "test://test",
		Client:  &httpDirect,
		Sys:     testutils.NewSysAbstraction(),
	})

	return client
}
