package handlers_http

import (
	"net/http"
	"testing"

	"github.com/mabels/runified/testutils"
)

func TestAllowMethodEmpty(t *testing.T) {
	fn := AllowMethods()
	apih := &testutils.MockApiHandler[struct{}, struct{}]{
		Res: testutils.NewMockResponseWriter(),
	}
	fn(apih)
	if apih.Res.StatusCode == 405 {
		t.Error("Status code not set to 405", apih.Res.StatusCode)
	}
}

func TestAllowMethodNotHit(t *testing.T) {
	fn := AllowMethods("TEST", "REST")
	apih := &testutils.MockApiHandler[struct{}, struct{}]{
		Res: testutils.NewMockResponseWriter(),
		Req: &http.Request{
			Method: "BRETT",
		},
	}
	fn(apih)
	if apih.Res.StatusCode != 405 {
		t.Error("Status code not set to 405", apih.Res.StatusCode)
	}
}

func TestAllowMethodMatch(t *testing.T) {
	methods := []string{"TEST", "REST"}
	fn := AllowMethods(methods...)
	for _, method := range methods {
		apih := &testutils.MockApiHandler[struct{}, struct{}]{
			Res: testutils.NewMockResponseWriter(),
			Req: &http.Request{
				Method: method,
			},
		}
		fn(apih)
		if apih.Res.StatusCode == 405 {
			t.Error("Status code not set to 405", apih.Res.StatusCode)
		}
	}
}
