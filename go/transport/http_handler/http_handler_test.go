package transport_http_handler

import (
	"context"
	"fmt"
	"net/http"
	"sync"
	"testing"

	types_app "github.com/mabels/runified/types/app"
)

// TODO rename to http_handler_test.go

// func NewHTTPHandler() *HTTPHandler {}
// func (h *HTTPHandler) Start()error{return err}
// func (h *HTTPHandler) Stop()error{return err}

// var onlyOne = sync.Mutex{}

func TestStartStop(t *testing.T) {
	hp := NewHTTPHandler(HTTPHandlerParam{
		Ctx:    context.Background(),
		Listen: types_app.AddrPort{Addr: "[::]", Port: 8087},
	})
	if hp == nil {
		t.Fatal("Handler is nil")
	}

	wg := sync.WaitGroup{}
	wg.Add(1)
	reallyDone := false
	go func() {
		wg.Done()
		err := hp.Start()
		if err != nil && err != http.ErrServerClosed {
			t.Error(err)
		}
		reallyDone = true
	}()
	wg.Wait()

	err := hp.Stop()
	if err != nil {
		t.Error("stop failed to return nil, err:", err)
	}
	if !reallyDone {
		t.Error("done not called")
	}
}

// func (h *HTTPHandler) RegisterHandler(path string, fn http.HandlerFunc)(func(),error){return nil,nil}
func TestDoubleRegister(t *testing.T) {
	// test 2 same path registers
	hp := NewHTTPHandler(HTTPHandlerParam{
		Ctx:    nil,
		Listen: types_app.AddrPort{Addr: "[::]", Port: 8087},
	})

	_, err := hp.RegisterHandler("/hi", func(w http.ResponseWriter, r *http.Request) {})
	if err != nil {
		t.Error("RegisterHandler failed")
	}

	_, err = hp.RegisterHandler("/hi", func(w http.ResponseWriter, r *http.Request) {})
	if err == nil {
		t.Error("Double RegisterHandler worked")
	}
}
func TestRegisterUnregister(t *testing.T) {
	// test 2 same path registers
	hp := NewHTTPHandler(HTTPHandlerParam{
		Ctx:    nil,
		Listen: types_app.AddrPort{Addr: "[::]", Port: 8087},
	})
	hpFN := func(w http.ResponseWriter, r *http.Request) {}
	unreg, err := hp.RegisterHandler("/hi", hpFN)
	if err != nil {
		t.Error("RegisterHandler failed")
	}
	if unreg == nil {
		t.Error("RegisterHandler failed")
	}
	_, err = hp.RegisterHandler("/hi", func(w http.ResponseWriter, r *http.Request) {})
	if err == nil {
		t.Error("Double RegisterHandler worked")
	}
	fn, found := hp.handlerMap["/hi"]
	if !found {
		t.Error("handlerMap value not registered")
	}
	if fn == nil {
		t.Error("function value different f")
	}
	unreg()
	unreg()
	_, err = hp.RegisterHandler("/hi", func(w http.ResponseWriter, r *http.Request) {})
	if err != nil {
		t.Error("RegisterHandler failed")
	}

}

type invokeItem struct {
	w http.ResponseWriter
	r *http.Request
}

func TestComplete(t *testing.T) {
	// test requests responses
	hp := NewHTTPHandler(HTTPHandlerParam{
		Ctx:    context.Background(),
		Listen: types_app.AddrPort{Addr: "[::]", Port: 8087},
	})
	invokedHandler := []invokeItem{}

	_, err := hp.RegisterHandler("/hi", func(w http.ResponseWriter, r *http.Request) {
		invokedHandler = append(invokedHandler, invokeItem{
			w: w,
			r: r,
		})
	})

	if err != nil {
		t.Error("RegisterHandler failed")
	}

	//hp.Start()
	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		wg.Done()
		err := hp.Start()
		if err != nil && err != http.ErrServerClosed {
			t.Error(err)
		}
	}()
	wg.Wait()

	defer hp.Stop()

	loops := 3
	for i := 0; i < loops; i++ {
		res, err := http.Get(fmt.Sprintf("http://localhost:%d/hi?i=%d", hp.params.Listen.Port, i))
		//res, err := http.Get(fmt.Sprintf("http://localhost:%d/hi", app.CLIConfig().Listen.Port))
		if err != nil {
			t.Error("http Get request got error:", err)
		}
		if res.StatusCode != 200 {
			t.Error("http Get request got non 200 status code:", res.StatusCode)
		}
		if res.Body == nil {
			t.Error("http Get request got nil body")
		} else {
			res.Body.Close()
		}
	}

	if len(invokedHandler) != loops {
		t.Error("did not receive the correct amount of responses from Get requests")
	}

	for i, item := range invokedHandler {
		if item.r.URL.Path != "/hi" {
			t.Error("Hi Mismatch")
		}

		if item.r.URL.Query().Get("i") != fmt.Sprintf("%d", i) {
			t.Error("i query different")
		}

	}

}
