(async () => {
    const sa = await import("./system_abstraction");

    const my = new sa.SystemAbstractionImpl();

    const larg = process.argv[process.argv.length - 1]
    console.log(JSON.stringify({
        larg,
        pid: process.pid,
    }));

    my.OnExit(async () => {
        await my.Time().Sleep(100);
        console.log(JSON.stringify({
            larg,
            pid: process.pid,
            msg: "Called OnExit 1"
        }));
    });
    my.OnExit(async () => {
        await my.Time().Sleep(200);
        console.log(JSON.stringify({
            larg,
            pid: process.pid,
            msg: "Called OnExit 2"
        }));
    });

    switch (larg) {
        case "sigint":
            await my.Time().Sleep(100);
            process.kill(process.pid, "SIGINT");
            await my.Time().Sleep(1000000);
            break;
        case "sigquit":
            await my.Time().Sleep(100);
            process.kill(process.pid, "SIGQUIT");
            await my.Time().Sleep(1000000);
            break;
        case "sigterm":
            await my.Time().Sleep(100);
            process.kill(process.pid, "SIGTERM");
            await my.Time().Sleep(1000000);
            break
        case "throw":
            await my.Time().Sleep(100);
            throw new Error("throwing");
        case "sleep":
            await my.Time().Sleep(3000);
            break;
        case "exit24":
        default:
            my.Exit(24);
    }

})()