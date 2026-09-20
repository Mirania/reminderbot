import * as cp from "child_process";
import * as utils from './utils';
import * as data from "./data";
import moment = require("moment-timezone");

type BatteryStatus = { percentage: number, isCharging: boolean };
type BatteryHistoryEntry = { percentage: number, timestamp: moment.Moment };

let batteryHistory: BatteryHistoryEntry[] = [];
const batteryHistorySize = 5;

export function getBatteryStatus(): Promise<BatteryStatus> {
    return new Promise((resolve, reject) => {
        utils.log("Querying battery status...");

        cp.exec("termux-battery-status", (error, stdout, stderr) => {
            utils.log(`Got raw output:\nerror -> ${error}\nstderr -> ${stderr}\nstdout -> ${stdout}`);
            if (error) { reject("Got an exec exception:\n" + error); return; }
            if (stderr) { reject("Got stderr:\n" + stderr); return; }

            try {
                const status = JSON.parse(stdout);

                if (batteryHistory.length > batteryHistorySize) batteryHistory.shift();
                batteryHistory.push({ percentage: status.percentage, timestamp: moment().tz(data.getTimezone()) });

                resolve({ percentage: status.percentage, isCharging: status.status === "CHARGING" });
            } catch (e) {
                reject("Got a battery status output but failed to parse it:\n" + e + "\n\nThe stdout was:\n" + stdout);
            }
        });
    });
}

export function getBatteryHistory(): BatteryHistoryEntry[] {
    return batteryHistory;
}
