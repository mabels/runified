package kv_inmemory

import (
	"github.com/mabels/runified/types"
)

type KVInMemory struct {
	store map[string][]byte
}

func NewInMemory() *KVInMemory {
	return &KVInMemory{
		store: make(map[string][]byte),
	}
}

func (kv *KVInMemory) Get(key string) ([]byte, error) {
	ret, found := kv.store[key]
	if !found {
		return ret, types.KeyNotFound{Key: key}
	}
	return ret, nil
}

func (kv *KVInMemory) Set(key string, val []byte) error {
	kv.store[key] = val
	return nil
}

func (kv *KVInMemory) Del(key string) ([]byte, error) {
	ret, found := kv.store[key]
	if !found {
		return ret, types.KeyNotFound{Key: key}
	}
	delete(kv.store, key)
	return ret, nil
}
