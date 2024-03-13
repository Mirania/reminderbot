import * as cp from "child_process";

export function getBatteryStatus(): Promise<{ percentage: number, isCharging: boolean }> {
    return new Promise((resolve, reject) => {
        cp.exec("termux-battery-status", (error, stdout, stderr) => {
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