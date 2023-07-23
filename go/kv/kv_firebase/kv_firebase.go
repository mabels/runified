package kv_firebase

import (
	"context"

	firebase "firebase.google.com/go"
	"firebase.google.com/go/db"
	types_app "github.com/mabels/runified/types/app"
	"google.golang.org/api/option"
)

type KVFirebaseRealtimeDB struct {
	app *firebase.App
	db  *db.Client
	ctx context.Context
}

func NewFirebaseRealtimeDB(fbconfig types_app.FireBaseConfig, ctx context.Context) (*KVFirebaseRealtimeDB, error) {

	firebaseConfig := &firebase.Config{
		DatabaseURL: fbconfig.DBUrl,
	}
	opt := option.WithCredentialsFile(fbconfig.ServiceAccountKeyPath)
	app, err := firebase.NewApp(ctx, firebaseConfig, opt)
	if err != nil {
		return nil, err
	}
	db, err := app.Database(ctx)
	if err != nil {
		return nil, err
	}

	return &KVFirebaseRealtimeDB{
		app: app,
		db:  db,
		ctx: ctx,
	}, nil
}

func (kv *KVFirebaseRealtimeDB) Get(key string) ([]byte, error) {
	panic("TOODO")
	// ret, found := kv.store[key]
	// if !found {
	// 	return ret, types.KeyNotFound{Key: key}
	// }
	// return ret, nil
}

func (kv *KVFirebaseRealtimeDB) Set(key string, val []byte) error {

	runifiedRef := kv.db.NewRef(key)

	// data := map[string]interface{}{}
	// err := json.Unmarshal(val, &data)
	// if err != nil {
	// 	return err
	// }
	data := entities_runified.runifiedProduct{runifiedProductReq: entities_runified.runifiedProductReq{Id: "123"}}
	err := runifiedRef.Set(kv.ctx, &data)
	return err
}

func (kv *KVFirebaseRealtimeDB) Del(key string) ([]byte, error) {
	panic("TOODO")
	// ret, found := kv.store[key]
	// if !found {
	// 	return ret, types.KeyNotFound{Key: key}
	// }
	// delete(kv.store, key)
	// return ret, nil
}
