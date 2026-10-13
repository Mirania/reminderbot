import moment = require("moment-timezone");
import * as utils from "./utils";

export type RelativeTime = { 
    valid: false 
} | { 
    valid: true, 
    date: moment.Moment, 
    timeValues: { [unit: string]: number } 
};

export type AbsoluteTime = {
    valid: false,
    isSecondArgInputted: boolean
} | {
    valid: true, 
    date: moment.Moment, 
    isSecondArgInputted: boolean
};

// 1a2b3c123def ...
export const relativeTimeRegex = /^(\d+[A-Za-z]+)+$/;

export function parseRelativeTime(start: moment.Moment, relativeTime: string, tz: string): RelativeTime {
    const tokens = relativeTime.match(/\d+|[A-Za-z]+/g) ?? [,];
    const timeValues: { [unit: string]: number } = {};

    utils.log(`Tokens = ${JSON.stringify(tokens)}`);

    for (let i = 0; i < tokens.length; i += 2) {
        let value: number;

        if (i + 1 >= tokens.length || timeValues[tokens[i + 1]] != undefined || isNaN(value = Number(tokens[i])) || value <= 0) {
            return { valid: false };
        }

        timeValues[tokens[i + 1]] = value;
    }

    utils.log(`Time values = ${JSON.stringify(timeValues)}`);

    const date = moment(start).tz(tz);

    for (const unit in timeValues) {
        const value = timeValues[unit];
        switch (unit) {
            case "year": case "yr": case "y": date.add(value, "year"); break;
            case "month": case "mo": date.add(value, "month"); break;
            case "week": case "wk": case "w": date.add(value, "week"); break;
            case "day": case "d": date.add(value, "day"); break;
            case "hour": case "hr": case "h": date.add(value, "hour"); break;
            case "minute": case "min": case "m": date.add(value, "minute"); break;
            default: return { valid: false };
        }
    }

    return { valid: true, date, timeValues };
}

export function parseAbsoluteTime(dateArg: string, timeArg: string | undefined, now: moment.Moment, tz: string): AbsoluteTime {
    const { converted, isSecondArgInputted } = convertAbsoluteTimeRawInput(dateArg, timeArg, now);

    if (!/[\d]{2}\/[\d]{2}\/[\d]{4} [\d]{2}:[\d]{2}/g.test(converted)) {
        return { valid: false, isSecondArgInputted };
    }

    const date = moment.tz(converted, "DD/MM/YYYY HH:mm", tz);

    return { valid: true, date, isSecondArgInputted };
}

function convertAbsoluteTimeRawInput(dateOrTimeArg: string, timeArg: string | undefined, now: moment.Moment): { converted: string, isSecondArgInputted: boolean } {
    let convertedDate = "invalid", convertedTime = "invalid", isSecondArgInputted = true;

    const weekdayRegex = /^[A-Za-z]+$/;
    const shortDateRegex = /^([\d]{1,2})\/([\d]{1,2})$/;
    const longDateRegex = /^([\d]{1,2})\/([\d]{1,2})\/([\d]{2}|[\d]{4})$/;
    const shortTimeRegex = /^[\d]{1,2}[hH]?$/;
    const longTimeRegex = /^([\d]{1,2}):([\d]{2})$/;

    // the first arg is certainly part of the absolute time definition, and it may be a date or a time

    if (weekdayRegex.test(dateOrTimeArg)) {
        // referring to a weekday by name
        // example: sun
        let targetWeekday: number;
        switch (dateOrTimeArg.toLowerCase()) {
            case "sun": case "sunday": targetWeekday = 0; break;
            case "mon": case "monday": targetWeekday = 1; break;
            case "tue": case "tuesday": targetWeekday = 2; break;
            case "wed": case "wednesday": targetWeekday = 3; break;
            case "thu": case "thursday": targetWeekday = 4; break;
            case "fri": case "friday": targetWeekday = 5; break;
            case "sat": case "saturday": targetWeekday = 6; break;
            case "td": case "tdy": case "today": targetWeekday = -2; break;
            case "tm": case "tmr": case "tmrw": case "tomorrow": targetWeekday = -3; break;
            default: targetWeekday = -1;
        }
        if (targetWeekday === -1) {
            // unknown weekday
            convertedDate = "invalid";
        } else if (targetWeekday === -2) {
            convertedDate = moment(now).format("DD/MM/YYYY");
        } else if (targetWeekday === -3) {
            convertedDate = moment(now).add(1, "day").format("DD/MM/YYYY");
        } else {
            const currentWeekday = now.weekday();
            convertedDate = moment(now).add(targetWeekday > currentWeekday ? targetWeekday - currentWeekday : targetWeekday + 7 - currentWeekday, "day").format("DD/MM/YYYY");
        }
    } else if (shortDateRegex.test(dateOrTimeArg)) {
        // this is a date. year is missing so we assume this is in the near future (this year or the next)
        // example: 06/06 or 2/7
        const match = dateOrTimeArg.match(shortDateRegex);
        const day = Number(match[1]), month = Number(match[2]);
        const year = (month > now.month() + 1 || (month === now.month() + 1 && day > now.date())) ? now.year() : now.year() + 1;
        convertedDate = `${zeroPad(day)}/${zeroPad(month)}/${yearPad(year)}`;
    } else if (longDateRegex.test(dateOrTimeArg)) {
        // this is a date
        // example: 04/06/2025 or 7/6/2025 or 02/1/25
        const match = dateOrTimeArg.match(longDateRegex);
        convertedDate = `${zeroPad(match[1])}/${zeroPad(match[2])}/${yearPad(match[3])}`;
    } else if (shortTimeRegex.test(dateOrTimeArg)) {
        // this is a time. date is missing so we assume this is in the near future (today or tomorrow)
        // example: 21 or 21h
        const hour = Number(dateOrTimeArg.toLowerCase().endsWith("h") ? dateOrTimeArg.substring(0, dateOrTimeArg.length - 1) : dateOrTimeArg);
        const date = now.hour() >= hour ? moment(now).add(1, "day") : now;
        convertedDate = date.format("DD/MM/YYYY");
        convertedTime = `${zeroPad(dateOrTimeArg)}:00`;
    } else if (longTimeRegex.test(dateOrTimeArg)) {
        // this is a time. date is missing so we assume this is in the near future (today or tomorrow)
        // 04:00 or 7:15
        const match = dateOrTimeArg.match(longTimeRegex);
        const hour = Number(match[1]), minute = Number(match[2]);
        const date = (now.hour() > hour || (now.hour() === hour && now.minute() >= minute)) ? moment(now).add(1, "day") : now;
        convertedDate = date.format("DD/MM/YYYY");
        convertedTime = `${zeroPad(hour)}:${zeroPad(minute)}`;
    }

    // the second arg might not be part of the absolute time definition; if it is, it may only be a time

    if (convertedTime !== "invalid") {
        // first arg already successfully parsed as a time, no need to check second arg
        isSecondArgInputted = false;
    } else if (shortTimeRegex.test(timeArg)) {
        // this is a time
        // 8 or 8h or 14h
        const time = timeArg.toLowerCase().endsWith("h") ? timeArg.substring(0, timeArg.length - 1) : timeArg;
        convertedTime = `${zeroPad(time)}:00`;
    } else if (longTimeRegex.test(timeArg)) {
        // this is a time
        // 04:00 or 7:15
        const match = timeArg.match(longTimeRegex);
        convertedTime = `${zeroPad(match[1])}:${zeroPad(match[2])}`;
    } else {
        // no second arg supplied
        convertedTime = "06:00";
        isSecondArgInputted = false;
    }

    utils.log(`Converted date = ${convertedDate}, converted time = ${convertedTime}, secong arg inputted? = ${isSecondArgInputted}`);
    return { converted: `${convertedDate} ${convertedTime}`, isSecondArgInputted: isSecondArgInputted };
}

function zeroPad(n: number | string) {
    const parsed = typeof n === "number" ? n : parseInt(n);
    return parsed < 10 ? `0${parsed}` : `${parsed}`;
}

function yearPad(n: number | string) {
    const parsed = typeof n === "number" ? n : parseInt(n);
    return parsed < 10 ? `200${parsed}` : parsed < 100 ? `20${parsed}` : `${parsed}`;
}
