package testutils

import (
	"fmt"

	"github.com/mabels/runified/types"
	"github.com/mabels/runified/utils"
)

type sysAbstraction struct {
	time types.Time
}

func (sa *sysAbstraction) Time() types.Time {
	return sa.time
}

func NewSysAbstraction(timeModes ...string) types.SysAbstraction {
	var time types.Time
	time = &MockConstTime{}
	timeMode := "const"
	if len(timeModes) != 0 {
		timeMode = timeModes[0]
	}
	switch timeMode {
	case "real":
		time = utils.SysAbstraction.Time()
	case "const", "":
		time = &MockConstTime{}
	case "step":
		time = &MockStepTime{}
	default:
		panic(fmt.Sprintf("unknown time mode:%s", timeMode))
	}
	return &sysAbstraction{
		time: time,
	}
}
