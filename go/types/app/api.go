package types_app

import (
	"fmt"

	"github.com/mabels/runified/types"
	"github.com/rs/zerolog"
)

type API interface {
	App() App
	Log() *zerolog.Logger
	KeyValueStore(storeName string) (types.KeyValueStoreBlob, error)
}

type ErrKVStoreNotSupported struct {
	Key string
}

func (f ErrKVStoreNotSupported) Error() string {
	return fmt.Sprintf("KVStore type unknown: %s", f.Key)
}
