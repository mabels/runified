package kv

import (
	"github.com/mabels/runified/types"
)

type wrappedKvStore[T any] struct {
	blobStore types.KeyValueStoreBlob
	serde     types.SerDe
	factory   func() *T
}

// Del implements types.KeyValueStore.
func (w *wrappedKvStore[T]) Del(key string) (*T, error) {
	my := w.factory()
	bytes, err := w.blobStore.Del(key)
	if err != nil {
		return my, err
	}
	w.serde.Unmarshal(bytes, &my)
	return my, err
}

// Get implements types.KeyValueStore.
func (w *wrappedKvStore[T]) Get(key string) (*T, error) {
	bytes, err := w.blobStore.Get(key)
	if err != nil {
		return nil, err
	}
	my := w.factory()
	err = w.serde.Unmarshal(bytes, my)
	return my, err
}

// Set implements types.KeyValueStore.
func (w *wrappedKvStore[T]) Set(key string, value *T) error {
	bytes, err := w.serde.Marshal(value)
	if err != nil {
		return err
	}
	return w.blobStore.Set(key, bytes)
}

func WrapKvStore[T any](blobStore types.KeyValueStoreBlob, serde types.SerDe, factory func() *T) types.KeyValueStore[T] {
	return &wrappedKvStore[T]{
		blobStore: blobStore,
		serde:     serde,
		factory:   factory,
	}
}
