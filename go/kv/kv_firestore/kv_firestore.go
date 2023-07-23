package kv_firestore

import (
	"context"
	"encoding/json"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go"
	"github.com/mabels/runified/types"
	types_app "github.com/mabels/runified/types/app"
	"google.golang.org/api/option"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type KVFirestore struct {
	app    *firebase.App
	client *firestore.Client
	ctx    context.Context
}

func NewFirestore(fbconfig types_app.FireBaseConfig, ctx context.Context) (*KVFirestore, error) {

	firebaseConfig := &firebase.Config{
		DatabaseURL: fbconfig.DBUrl,
	}
	opt := option.WithCredentialsFile(fbconfig.ServiceAccountKeyPath)
	app, err := firebase.NewApp(ctx, firebaseConfig, opt)
	if err != nil {
		return nil, err
	}
	client, err := app.Firestore(ctx)
	if err != nil {
		return nil, err
	}
	//defer client.Close() //TODO where to put this?

	return &KVFirestore{
		app:    app,
		client: client,
		ctx:    ctx,
	}, nil
}

func (kv *KVFirestore) Get(key string) ([]byte, error) {

	// ret, found := kv.store[key]
	// if !found {
	// 	return ret, types.KeyNotFound{Key: key}
	// }
	// return ret, nil
	docRef := kv.client.Doc(key)

	docSnapshot, err := docRef.Get(kv.ctx)

	if status.Code(err) == codes.NotFound {
		return nil, types.KeyNotFound{Key: key}
	}
	docData, err := json.Marshal(docSnapshot.Data())
	if err != nil {
		return nil, err
	}
	return docData, err

}

func (kv *KVFirestore) Set(key string, val []byte) error {

	docRef := kv.client.Doc(key)

	err := json.Unmarshal(val, &data)
	if err != nil {
		return err
	}

	_, err = docRef.Set(kv.ctx, &data)
	return err
}

func (kv *KVFirestore) Del(key string) ([]byte, error) {
	panic("TOODO")
	// docRef := kv.client.Doc(key)
	// delRes, err := docRef.Delete(kv.ctx)
	// json, err2 := json.Marshal(delRes)
	// if err != nil {
	// 	return json, err
	// }
	// if err2 != nil {
	// 	return json, err
	// }
	// return json, nil
}
