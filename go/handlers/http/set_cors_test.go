package handlers_http

import (
	"net/http"
	"testing"

	"github.com/mabels/runified/testutils"
)

func TestSetCords(t *testing.T) {
	api := &testutils.MockApi{}
	r, err := http.NewRequest("OPTIONS", "test://test", nil)
	if err != nil {
		t.Fatal(err)
	}
	w := testutils.NewMockResponseWriter()
	hdl := &testutils.MockApiHandler[struct{}, struct{}]{
		ApiRef: api,
		Req:    r,
		Res:    w,
	}
	SetCorsHeader(hdl)

	if w.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Error("Access-Control-Allow-Origin not set")
	}

}
