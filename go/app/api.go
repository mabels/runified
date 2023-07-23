package app

import (
	"github.com/mabels/runified/kv/kv_firebase"
	"github.com/mabels/runified/kv/kv_firestore"
	"github.com/mabels/runified/kv/kv_inmemory"
	"github.com/mabels/runified/types"
	types_app "github.com/mabels/runified/types/app"
	"github.com/rs/zerolog"
)

type api struct {
	app types_app.App
}

func (api *api) KeyValueStore(storeName string) (types.KeyValueStoreBlob, error) {
	switch api.app.CLIConfig().KVStoreType {
	case "inmemory":
		return kv_inmemory.NewInMemory(), nil
	case "firebase":
		return kv_firebase.NewFirebaseRealtimeDB(api.app.CLIConfig().FireBase, api.app.Context())
	case "firestore":
		return kv_firestore.NewFirestore(api.app.CLIConfig().FireBase, api.app.Context())
	default:
		return nil, types_app.ErrKVStoreNotSupported{Key: api.app.CLIConfig().KVStoreType}

	}
}

func (api *api) App() types_app.App {
	return api.app
}

func (api *api) Log() *zerolog.Logger {
	return api.app.Log()
}
