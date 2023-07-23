package sdk

import (
	"bytes"
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"testing"

	"github.com/mabels/runified/app"
	"github.com/mabels/runified/testutils"
	types_app "github.com/mabels/runified/types/app"
	"github.com/rs/zerolog"
	"github.com/stretchr/testify/assert"
)

// POST / OPTIONS

func startApp(t *testing.T, fn func(t *testing.T, baseUrl string, app types_app.App, logCollector *testutils.LogCollector)) {
	logCollector := testutils.LogCollector{}

	log := zerolog.New(&logCollector).With().Timestamp().Logger()
	cliCFG := app.FromCommandLine([]string{})
	app := app.NewApp(&types_app.AppParam{Log: &log, CLIconfig: cliCFG, Sys: testutils.NewSysAbstraction()})

	wg := sync.WaitGroup{}
	wg.Add(1)
	go func() {
		wg.Done()
		err := app.Start()
		if err != nil {
			t.Error("Start failed to return nil", err)
		}
	}()
	wg.Wait()
	fn(t, fmt.Sprintf("http://%s:%d/", "127.0.0.1", app.CLIConfig().Listen.Port), app, &logCollector)
	err := app.Stop()
	if err != nil {
		t.Error("Stop failed to return nil", err)
	}
}

func TestRunifiedDataGetMethod(t *testing.T) {
	startApp(t, func(t *testing.T, baseUrl string, app types_app.App, logCollector *testutils.LogCollector) {
		url, _ := url.JoinPath(baseUrl, "/runified")
		req, err := http.NewRequest("GET", url, bytes.NewBufferString(strings.Repeat("a", 1000)))
		if err != nil {
			t.Error("GET failed", err)
		}
		res, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Error("GET failed", err)
		}
		if res.StatusCode != 405 {
			t.Error("GET failed", res.StatusCode)
		}
	})
}

func TestRunifiedData(t *testing.T) {
	startApp(t, func(t *testing.T, baseUrl string, app types_app.App, logCollector *testutils.LogCollector) {

		// Request to addRunifiedData
		runifiedDataReq := entities_runified.runifiedDataReq{
			CollectionAddress: "0x1234567890",
			Id:                "1",
			Category:          "category",
			DummyCategory:     "dummyCategory",
		}

		sdkClient := NewSdkClient(SdkClientParams{BaseUrl: baseUrl})
		runifiedData, rctx := sdkClient.RunifiedData(runifiedDataReq)
		if rctx.Error != nil {
			t.Error("RunifiedData failed", rctx.Error)
		}
		ref := entities_runified.runifiedData{
			runifiedDataReq: runifiedDataReq,
			CreatedAt:  app.Sys().Time().Now(),
		}
		// tests the returned runifiedData
		assert.Equal(t, &ref, runifiedData)
		logs := logCollector.Logs()
		if len(logs) != 1 {
			t.Error("logs not 2", logs)
		}

		if logs[0]["responseLength"].(float64) > float64(rctx.Stats.Response.Length) {
			t.Error("log responseLength not body", logs[0])
		}
		// requestHeaderByteLength test
		if logs[0]["requestLength"].(float64) < float64(rctx.Stats.Request.Length) {
			t.Error("log requestHeaderByteLength wrong", logs[0])
		}
		if logs[0]["rid"] != rctx.RequestId {
			t.Error("log rid wrong", logs[0])
		}
	})
}

func TestRunifiedProduct(t *testing.T) {
	startApp(t, func(t *testing.T, baseUrl string, app types_app.App, logCollector *testutils.LogCollector) {

		// Request to addrunifiedData
		runifiedDataReq := entities_runified.runifiedDataReq{
			CollectionAddress: "0x1234567890",
			Id:                "1",
			Category:          "category",
			DummyCategory:     "dummyCategory",
		}

		sdkClient := NewSdkClient(SdkClientParams{BaseUrl: baseUrl})
		runifiedData, rctx := sdkClient.RunifiedData(runifiedDataReq)
		if rctx.Error != nil {
			t.Error("RunifiedData failed", rctx.Error)
		}
		ref := entities_runified.runifiedData{
			runifiedDataReq: runifiedDataReq,
			CreatedAt:  app.Sys().Time().Now(),
		}
		// tests the returned runifiedData
		assert.Equal(t, &ref, runifiedData)

	})
}
