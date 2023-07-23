package transport_http_handler

import (
	"context"
	"fmt"
	"net/http"
	"sync"

	"github.com/mabels/runified/types"
	types_app "github.com/mabels/runified/types/app"
)

type HTTPHandlerParam struct {
	Ctx        context.Context
	Listen     types_app.AddrPort
	HttpServer types.HttpServer
}
type HTTPHandler struct {
	srv        types.HttpServer
	ctx        context.Context
	params     HTTPHandlerParam
	handlerMap map[string]http.HandlerFunc
	done       sync.WaitGroup
}

type goHttpServer struct {
	srv *http.Server
}

func (gs *goHttpServer) SetHandler(h http.Handler) {
	gs.srv.Handler = h
}

func (gs *goHttpServer) ListenAndServe() error {
	return gs.srv.ListenAndServe()
}

func (gs *goHttpServer) Shutdown(ctx context.Context) error {
	return gs.srv.Shutdown(ctx)
}

func newGoHttpServer(ap types_app.AddrPort) types.HttpServer {
	return &goHttpServer{
		srv: &http.Server{
			Addr: fmt.Sprintf("%s:%d", ap.Addr, ap.Port),
		},
	}
}

func NewHTTPHandler(hp HTTPHandlerParam) *HTTPHandler {
	if hp.Ctx == nil {
		hp.Ctx = context.Background()
	}
	ctx, _ := context.WithCancel(hp.Ctx)
	if hp.HttpServer == nil {
		hp.HttpServer = newGoHttpServer(hp.Listen)
	}
	ret := &HTTPHandler{
		ctx:        ctx,
		params:     hp,
		srv:        hp.HttpServer,
		handlerMap: make(map[string]http.HandlerFunc),
	}
	ret.srv.SetHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fn, found := ret.handlerMap[r.URL.Path]
		if found {
			fn(w, r)
		}
		//_404Page(w,r)
	}))
	return ret
}

func (h *HTTPHandler) Start() error {
	h.done.Add(1)
	err := h.srv.ListenAndServe()
	h.done.Done()
	return err
}

func (h *HTTPHandler) Stop() error {
	err := h.srv.Shutdown(h.ctx)
	h.done.Wait()
	return err
}

func (h *HTTPHandler) RegisterHandler(path string, fn http.HandlerFunc) (func(), error) {
	_, found := h.handlerMap[path]
	if found {
		return nil, fmt.Errorf("Handler already registered, path: %s", path)
	}
	h.handlerMap[path] = fn
	return func() {
		delete(h.handlerMap, path)
	}, nil
}

// func StartServer(port uint16) {
// 	contextLogger := zerolog.New(os.Stdout).With().Uint16("port", port).Timestamp().Logger()
// 	contextLogger.Info().Msg("StartServer called")

// 	//myHelloHandler := constructHandler("Hello")
// 	http.HandleFunc("/", HelloHandler)

// 	http.HandleFunc("/hi", HiHandler)

// 	log.Fatal(http.ListenAndServe(fmt.Sprintf(":%d", port), nil))
// }
