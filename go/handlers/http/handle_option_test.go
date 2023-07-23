package handlers_http

import (
	"net/http"
	"testing"

	"github.com/mabels/runified/testutils"
)

func TestHandleOption(t *testing.T) {

	r, err := http.NewRequest("OPTIONS", "test://test", nil)
	if err != nil {
		t.Fatal(err)
	}
	api := &testutils.MockApi{}
	w := testutils.NewMockResponseWriter()
	hdl := &testutils.MockApiHandler[struct{}, struct{}]{
		ApiRef: api,
		Req:    r,
		Res:    w,
	}
	retVal := HandleOPTIONS(hdl)

	if retVal != false {
		t.Error("HandleOptions with Method OPTIONS should return false")
	}

	if w.Header().Get("Access-Control-Allow-Methods") != "POST,GET" {
		t.Error("Access-Control-Allow-Methods not set")
	}

	if w.Header().Get("Access-Control-Allow-Headers") != "Content-Type" {
		t.Error("Access-Control-Allow-Headers not set")
	}
	if w.Header().Get("Access-Control-Max-Age") != "3600" {
		t.Error("Access-Control-Max-Age not set")
	}
	if w.StatusCode != 204 {
		t.Error("Status code not set to 204", w.StatusCode)
	}

}
