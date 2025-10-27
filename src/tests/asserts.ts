import moment = require("moment");
import { AbsoluteTime, RelativeTime, parseAbsoluteTime, parseRelativeTime } from "../parsers";

const tz = "Europe/Lisbon";

function momentFrom(string: string) {
    return moment.tz(string, "DD/MM/YYYY HH:mm", tz);
}

function assertRelativeTime(a: RelativeTime, b: RelativeTime) {
    let aKeys: string[], bKeys: string[];
    if (a.valid !== b.valid || 
        a.date?.valueOf() !== b.date?.valueOf() || 
        (aKeys = Object.keys(a.timeValues ?? {})).length !== (bKeys = Object.keys(b.timeValues ?? {})).length ||
        aKeys.some(key => a.timeValues[key] !== b.timeValues[key])) {
            throw new Error(`relative time assert failed for:\n(expected) ${JSON.stringify(a)}\n(actual)   ${JSON.stringify(b)}`);
    }
}

function assertAbsoluteTime(a: AbsoluteTime, b: AbsoluteTime) {
    if (a.valid !== b.valid ||
        a.date?.valueOf() !== b.date?.valueOf() ||
        (a.isTimeInputted !== b.isTimeInputted)) {
            throw new Error(`absolute time assert failed for:\n(expected) ${JSON.stringify(a)}\n(actual)   ${JSON.stringify(b)}`);
    }
}

const now = momentFrom("02/02/2025 00:00");

assertRelativeTime({ valid: false }, parseRelativeTime(now, "1x", tz));
assertRelativeTime({ valid: false }, parseRelativeTime(now, "abcd", tz));
assertRelativeTime({ valid: false }, parseRelativeTime(now, "1.1d", tz));
assertRelativeTime({ valid: false }, parseRelativeTime(now, "1d0m", tz));
assertRelativeTime({ valid: false }, parseRelativeTime(now, "1d1x", tz));
assertRelativeTime({ valid: true, date: momentFrom("02/02/2025 00:01"), timeValues: {"m": 1} }, 
        parseRelativeTime(now, "1m", tz));
assertRelativeTime({ valid: true, date: momentFrom("05/02/2025 02:01"), timeValues: {"d": 3, "h": 2, "m": 1} }, 
        parseRelativeTime(now, "3d2h1m", tz));
assertRelativeTime({ valid: true, date: momentFrom("22/03/2028 12:36"), timeValues: {"y": 3, "w": 2, "mo": 1, "d": 6, "h": 12, "m": 36} }, 
        parseRelativeTime(now, "3y2w1mo6d12h36m", tz));

assertAbsoluteTime({ valid: false }, parseAbsoluteTime("abcd", undefined, now, tz));
assertAbsoluteTime({ valid: false }, parseAbsoluteTime("abcd", "23", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("02/02/2026 17:06"), isTimeInputted: true }, 
        parseAbsoluteTime("02/02/2026", "17:06", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("02/06/2026 17:06"), isTimeInputted: true },
    parseAbsoluteTime("02/6/2026", "17:06", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("03/07/2026 17:06"), isTimeInputted: true },
    parseAbsoluteTime("3/7/2026", "17:06", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("01/03/2025 17:06"), isTimeInputted: true },
    parseAbsoluteTime("1/3", "17:06", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("02/12/2025 17:06"), isTimeInputted: true },
    parseAbsoluteTime("02/12", "17:06", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("06/12/2025 17:06"), isTimeInputted: true },
    parseAbsoluteTime("6/12", "17:06", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("03/02/2025 06:00"), isTimeInputted: false },
    parseAbsoluteTime("03/02", undefined, now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("02/02/2026 06:00"), isTimeInputted: false },
    parseAbsoluteTime("02/02", undefined, now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("05/01/2026 06:00"), isTimeInputted: false },
    parseAbsoluteTime("5/1", undefined, now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("10/01/2026 12:00"), isTimeInputted: true },
    parseAbsoluteTime("10/1", "12h", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("02/02/2027 06:00"), isTimeInputted: false },
    parseAbsoluteTime("02/02/2027", undefined, now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("09/02/2025 11:05"), isTimeInputted: true },
    parseAbsoluteTime("sun", "11:05", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("03/02/2025 11:05"), isTimeInputted: true },
    parseAbsoluteTime("Mon", "11:05", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("04/02/2025 11:05"), isTimeInputted: true },
    parseAbsoluteTime("TUE", "11:05", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("05/02/2025 11:05"), isTimeInputted: true },
    parseAbsoluteTime("wed", "11:05", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("06/02/2025 11:05"), isTimeInputted: true },
    parseAbsoluteTime("thursday", "11:05", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("07/02/2025 11:05"), isTimeInputted: true },
    parseAbsoluteTime("friday", "11:05", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("08/02/2025 11:05"), isTimeInputted: true },
    parseAbsoluteTime("sat", "11:05", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("02/02/2025 11:05"), isTimeInputted: true },
    parseAbsoluteTime("today", "11:05", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("02/02/2025 06:00"), isTimeInputted: false },
    parseAbsoluteTime("today", undefined, now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("03/02/2025 06:00"), isTimeInputted: false },
    parseAbsoluteTime("tmrw", undefined, now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("07/02/2025 06:00"), isTimeInputted: false },
    parseAbsoluteTime("fri", undefined, now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("03/02/2025 07:15"), isTimeInputted: true },
    parseAbsoluteTime("03/02", "7:15", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("03/02/2025 04:00"), isTimeInputted: true },
    parseAbsoluteTime("03/02", "4h", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("03/02/2025 16:00"), isTimeInputted: true },
    parseAbsoluteTime("03/02", "16h", now, tz));
assertAbsoluteTime({ valid: true, date: momentFrom("03/02/2025 17:00"), isTimeInputted: true },
    parseAbsoluteTime("03/02", "17H", now, tz));