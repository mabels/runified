package utils

import (
	"time"

	"github.com/mabels/runified/types"
)

type sysTime struct{}

func (s *sysTime) Now() time.Time {
	return time.Now()
}

type sys struct {
}

func (s *sys) Time() types.Time {
	return &sysTime{}
}

var SysAbstraction = &sys{}
