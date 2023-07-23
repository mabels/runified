package handlers_http

import (
	"net/http"
	"testing"

	"github.com/mabels/runified/testutils"
)

func TestMapBrowserMethod(t *testing.T) {
	apih := &testutils.MockApiHandler[struct{}, struct{}]{
		Res: testutils.NewMockResponseWriter(),
		Req: &http.Request{
			Header: map[string][]string{},
			Method: "GET",
		},
	}
	if !MapBrowserMethod(apih) {
		t.Error("MapBrowserMethod should return true")
	}
	if apih.Request().Method != "GET" {
		t.Error("Method not set to GET", apih.Request().Method)
	}
}

func TestMapBrowserOverride(t *testing.T) {
	header := http.Header{}
	header.Add("X-HTTP-Method-Override", "POST")
	apih := &testutils.MockApiHandler[struct{}, struct{}]{
		Res: testutils.NewMockResponseWriter(),
		Req: &http.Request{
			Header: header,
			Method: "GET",
		},
	}
	if !MapBrowserMethod(apih) {
		t.Error("MapBrowserMethod should return true")
	}
	if apih.Request().Method != "POST" {
		t.Error("Method not set to POST", apih.Request().Method)
	}
}

func TestMapBrowserOverrideEmpty(t *testing.T) {
	apih := &testutils.MockApiHandler[struct{}, struct{}]{
		Res: testutils.NewMockResponseWriter(),
		Req: &http.Request{
			Header: map[string][]string{
				"X-HTTP-Method-Override": []string{""},
			},
			Method: "GET",
		},
	}
	if !MapBrowserMethod(apih) {
		t.Error("MapBrowserMethod should return true")
	}
	if apih.Request().Method != "GET" {
		t.Error("Method not set to POST", apih.Request().Method)
	}
}
