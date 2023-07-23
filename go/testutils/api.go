package testutils

import (
	"io"

	"github.com/mabels/runified/kv/kv_inmemory"
	"github.com/mabels/runified/types"
	types_app "github.com/mabels/runified/types/app"
	"github.com/rs/zerolog"
)

type MockApi struct {
	AppRef     types_app.App
	LogRef     *zerolog.Logger
	kvStoreMap map[string]types.KeyValueStoreBlob
}

func NewMockApi(cfg *types_app.CLIConfig, lc ...io.Writer) *MockApi {
	app := NewMockApp(cfg, lc...)
	log := app.Log().With().Str("MockApi", "MockApi").Timestamp().Logger()
	return &MockApi{
		AppRef:     app,
		LogRef:     &log,
		kvStoreMap: make(map[string]types.KeyValueStoreBlob),
	}
}
func (api *MockApi) KeyValueStore(kvStoreName string) (types.KeyValueStoreBlob, error) {
	kvStore, found := api.kvStoreMap[kvStoreName]
	if found {
		return kvStore, nil
	}
	api.kvStoreMap[kvStoreName] = kv_inmemory.NewInMemory() // Todo replace with kvFirestore ?
	return api.kvStoreMap[kvStoreName], nil
}
func (api *MockApi) App() types_app.App {
	return api.AppRef
}

func (api *MockApi) Log() *zerolog.Logger {
	return api.LogRef
}
