import * as cp from "child_process";
import * as utils from './utils';

export function getBatteryStatus(): Promise<{ percentage: number, isCharging: boolean }> {
    return new Promise((resolve, reject) => {
        utils.log("Querying battery statys...");

        cp.exec("termux-battery-status", (error, stdout, stderr) => {
            utils.log(`Got raw output:\nerror -> ${error}\nstderr -> ${stderr}\nstdout -> ${stdout}`);
            if (error) { reject("Got an exec exception:\n" + error); return; }
            if (stderr) { reject("Got stderr:\n" + stderr); return; }

            try {
                const status = JSON.parse(stdout);
                resolve({ percentage: status.percentage, isCharging: status.status === "CHARGING" });
            } catch (e) {
                reject("Got a battery status output but failed to parse it:\n" + e + "\n\nThe stdout was:\n" + stdout);
            }
        });
    });
}