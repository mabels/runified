package app

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"testing"

	types_app "github.com/mabels/runified/types/app"
	"github.com/rs/zerolog"
)

type logCollector struct {
	buf bytes.Buffer
}

func (l *logCollector) Write(p []byte) (n int, err error) {
	return l.buf.Write(p)
}

func (l *logCollector) logs() []map[string]interface{} {
	scanner := bufio.NewScanner(bufio.NewReader(&l.buf))
	results := []map[string]interface{}{}
	for scanner.Scan() {
		jsonStr := scanner.Text()
		my := map[string]interface{}{}
		err := json.Unmarshal([]byte(jsonStr), &my)
		if err != nil {
			panic(err)
		}
		results = append(results, my)
	}
	return results
}

func TestAppStartStop(t *testing.T) {
	logCollector := logCollector{
		buf: bytes.Buffer{},
	}

	log := zerolog.New(&logCollector).With().Timestamp().Logger()
	cliCFG := FromCommandLine([]string{})
	app := NewApp(&types_app.AppParam{Log: &log, CLIconfig: cliCFG}).(*app)
	app.httpHandler.RegisterHandler("/test", BindAppToHandler(app, func(app *types_app.AppHandler) {
		r := app.Request()
		w := app.Response()
		res, err := io.ReadAll(r.Body)
		if err != nil {
			t.Error("read body failed", err)
		}
		if string(res) != "hi" {
			t.Error("body not hi", string(res))
		}
		fmt.Fprintf(w, "Hi")
	}))
	if app.Log() != &log {
		t.Error("no log")
	}
	if app.Log() == nil {
		t.Error("Log nil")
	}
	if app.CLIConfig() != cliCFG {
		t.Error("config mismatch")
	}

	go func() {
		err := app.Start()
		if err != nil {
			t.Error("Start failed to return nil", err)
		}
	}()
	postBody := "hi"
	res, err := http.Post(fmt.Sprintf("http://localhost:%d/test", app.CLIConfig().Listen.Port), "application/json", strings.NewReader(postBody))
	if err != nil {
		t.Error("GET failed", err)
	}
	if res.StatusCode != 200 {
		t.Error("GET failed", res.StatusCode)
	}
	logs := logCollector.logs()
	if len(logs) != 1 {
		t.Error("logs not 2", logs)
	}
	// if logs[0]["level"] != "debug" {
	// 	t.Error("log level not debug", logs[0])
	// }
	// if logs[0]["path"] != "/test" {
	// 	t.Error("log path not /test", logs[0])
	// }
	// rid := logs[0]["rid"].(string)
	// if logs[0]["rid"] == "" {
	// 	t.Error("rid empty", logs[0])
	// }
	rid := res.Header.Get("X-Request-ID")
	if logs[0]["rid"] != rid {
		t.Error("rid empty", logs[0], rid)
	}
	if logs[0]["path"] != "/test" {
		t.Error("log path not rid", logs[0])
	}
	if logs[0]["level"] != "info" {
		t.Error("log level not info", logs[0])
	}
	if logs[0]["duration"].(float64) <= 0.0 {
		t.Error("log duration not > 0", logs[0])
	}
	body, err := ioutil.ReadAll(res.Body)
	if err != nil {
		t.Error("ReadAll failed", err)
	}
	if string(body) != "Hi" {
		t.Error("body not Hi", string(body))
	}

	if logs[0]["responseLength"].(float64) < float64(len(body)) {
		t.Error("log writtenBytes not body", logs[0])
	}
	// requestHeaderByteLength test
	if logs[0]["requestLength"].(float64) <= 0 {
		t.Error("log requestHeaderByteLength wrong", logs[0])
	}
	if logs[0]["rid"] == "" {
		t.Error("log rid wrong", logs[0])
	}

	err = app.Stop()
	if err != nil {
		t.Error("Stop failed to return nil", err)
	}
}

func TestNewAppContext(t *testing.T) {
	log := zerolog.New(os.Stdout).With().Timestamp().Logger()
	cliCFG := FromCommandLine([]string{})
	app := NewApp(&types_app.AppParam{Log: &log, CLIconfig: cliCFG})

	if app.Context() == nil {
		t.Error("default context nil")
	}
	ctx := context.TODO()

	app = NewApp(&types_app.AppParam{Log: &log, CLIconfig: cliCFG, Ctx: ctx})

	if app.Context() != ctx {
		t.Error("TODO context set wrong")
	}
}
