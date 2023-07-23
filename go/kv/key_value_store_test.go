package kv

import (
	"testing"

	"github.com/mabels/runified/kv/kv_inmemory"
	"github.com/mabels/runified/types"
)

func testKV(t *testing.T, kv types.KeyValueStore[string]) {
	hiStr := "hi"
	err := kv.Set("test", &hiStr)
	if err != nil {
		t.Fatal(err)
	}
	v, err := kv.Get("test")
	if err != nil {
		t.Fatal(err)
	}
	if *v != "hi" {
		t.Fatal("value not hi", v)
	}
	prev, err := kv.Del("test")
	if err != nil {
		t.Fatal(err)
	}
	if *prev != "hi" {
		t.Fatal("value not hi", v)
	}
	_, err = kv.Del("test")
	_, isNotFound := err.(types.KeyNotFound)
	if !isNotFound {
		t.Fatal(err)
	}
	_, err = kv.Get("test")
	_, isNotFound = err.(types.KeyNotFound)
	if !isNotFound {
		t.Fatal(err)
	}
}

func TestInMemoryKV(t *testing.T) {
	bkv := kv_inmemory.NewInMemory()
	kv := WrapKvStore[string](bkv, &types.JsonSerDe{}, func() *string { return new(string) })
	testKV(t, kv)
}

func TestFireBaseKV(t *testing.T) {
	// _, err := kv_firebase.NewFirebaseRealtimeDB[kvString](context.Background(), types.FireBaseConfig{
	// 	DBUrl:                 "",
	// 	ServiceAccountKeyPath: "",
	// })
	// if err != nil {
	// 	t.Fatal(err)
	// }
	// testKV(t, kv.(KeyValueStore[kvString]))
}

func TestFireStore(t *testing.T) {
	// _, err := kv_firestore.NewFirestore(context.Background(),
	// 	types.FireBaseConfig{
	// 		DBUrl:                 "",
	// 		ServiceAccountKeyPath: "",
	// 	})
	// if err != nil {
	// 	t.Fatal(err)
	// }
	// testKV(t, kv.(KeyValueStore[kvString]))
}
