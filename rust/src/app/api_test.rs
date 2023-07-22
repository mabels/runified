package app

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"testing"

	"github.com/mabels/runified/testutils"
	"github.com/mabels/runified/types"
)

func TestPassOfRequestIdAndApp(t *testing.T) {
	// panic("TODO")
	// mockConfig := &types.CLIConfig{
	// 	AppName:  "test",
	// 	Listen:   types.AddrPort{Port: 8080},
	// 	FireBase: types.FireBaseConfig{},
	// }
	// api := testutils.NewMockApi(mockConfig)

	// expectedReqId := "api-test-pt"

	// apiHandler := apiHandler[struct{}, struct{}]{
	// 	api:       api,
	// 	requestId: expectedReqId,
	// }

	// WrapApiHandler(api, []types.ApiHandlerUnTyped{apiHandler}, func() *struct{} {
	// 	return &struct{}{}
	// })
	// reqId := apiHandler.RequestId()

	// if reqId != expectedReqId {
	// 	t.Errorf(fmt.Sprintf("RequestId, Got : %v , Want: %v ", reqId, expectedReqId))
	// }
}

// func (api *apiHandler[Q, S]) ErrorMsg(err error) {
// ErrorMsg
func TestApiErrorMsg(t *testing.T) {
	lc := testutils.LogCollector{}
	mw := testutils.NewMockResponseWriter()
	mockApi := testutils.NewMockApi(&types.CLIConfig{}, &lc)
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
	/* 	Status:    http.StatusInternalServerError,
	RequestId: api.RequestId(),
	Message:   err.Error(),
	*/
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

// WriteMsg
// RequestMsg
