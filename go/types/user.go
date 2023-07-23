package types

type User struct {
	OrganizationId string   `json:"organizationId"`
	Products       []string `json:"products"`
}
