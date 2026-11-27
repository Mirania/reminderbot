import moment = require("moment-timezone");
import * as utils from "./utils";

export type RelativeTimeValues = {
    y?: number,
    mo?: number,
    w?: number,
    d?: number,
    h?: number,
    m?: number,
    s?: number
};

export type RelativeTime = { 
    valid: false 
} | { 
    valid: true, 
    date: moment.Moment, 
    timeValues: RelativeTimeValues
};

export type AbsoluteTime = {
    valid: false,
    isSecondArgInputted: boolean,
    isRelativeTimeExtensionTooShort: boolean
} | {
    valid: true, 
    date: moment.Moment, 
    isSecondArgInputted: boolean,
    isRelativeTimeExtensionTooShort: boolean
};

// 1a2b3c123def ...
export const relativeTimeRegex = /^([-+]?\d+[A-Za-z]+)+$/;

export function isRelativeTime(time: RelativeTime | AbsoluteTime | null | undefined): time is RelativeTime {
    return time != null && typeof time['isSecondArgInputted'] !== "boolean";
}

export function isAbsoluteTime(time: RelativeTime | AbsoluteTime | null | undefined): time is AbsoluteTime {
    return time != null && typeof time['isSecondArgInputted'] === "boolean";
}

export function parseRelativeTime(start: moment.Moment, relativeTime: string, tz: string): RelativeTime {
    const tokens = relativeTime.match(/([-+]?\d+)|[A-Za-z]+/g) ?? [,];
    const rawTimeValues: { [unit: string]: number } = {};
    const normalizedTimeValues: RelativeTimeValues = {};

    for (let i = 0; i < tokens.length; i += 2) {
        let value: number;

        if (i + 1 >= tokens.length || rawTimeValues[tokens[i + 1]] != undefined || isNaN(value = Number(tokens[i]))) {
            utils.log(`Converted datetime = invalid`);
            return { valid: false };
        }

        rawTimeValues[tokens[i + 1]] = value;
    }

    const date = moment(start).tz(tz);

    for (const unit in rawTimeValues) {
        const value = rawTimeValues[unit];
        switch (unit) {
            case "years": case "year": case "yr": case "y": date.add(value, "year"); normalizedTimeValues.y = value; break;
            case "months": case "month": case "mo": date.add(value, "month"); normalizedTimeValues.mo = value; break;
            case "weeks": case "week": case "wk": case "w": date.add(value, "week"); normalizedTimeValues.w = value; break;
            case "days": case "day": case "d": date.add(value, "day"); normalizedTimeValues.d = value; break;
            case "hours": case "hour": case "hr": case "h": date.add(value, "hour"); normalizedTimeValues.h = value; break;
            case "minutes": case "minute": case "min": case "m": date.add(value, "minute"); normalizedTimeValues.m = value; break;
            case "seconds": case "second": case "sec": case "s": date.add(value, "second"); normalizedTimeValues.s = value; break;
            default: return { valid: false };
        }
    }

    utils.log(`Converted datetime = ${date.format("DD/MM/YYYY HH:mm")}, time values = ${JSON.stringify(normalizedTimeValues)}`);
    return { valid: true, date, timeValues: normalizedTimeValues };
}

export function parseAbsoluteTime(dateOrTimeArg: string, timeArg: string | undefined, now: moment.Moment, tz: string): AbsoluteTime {
    const { converted, isSecondArgInputted, isRelativeTimeExtensionTooShort } = convertAbsoluteTimeRawInput(dateOrTimeArg, timeArg, now, tz);

    if (!/[\d]{2}\/[\d]{2}\/[\d]{4} [\d]{2}:[\d]{2}/g.test(converted)) {
        return { valid: false, isSecondArgInputted, isRelativeTimeExtensionTooShort };
    }

    const date = moment.tz(converted, "DD/MM/YYYY HH:mm", tz);

    return { valid: true, date, isSecondArgInputted, isRelativeTimeExtensionTooShort };
}

function convertAbsoluteTimeRawInput(dateOrTimeArg: string, timeArg: string | undefined, now: moment.Moment, tz: string): 
        { converted: string, isSecondArgInputted: boolean, isRelativeTimeExtensionTooShort: boolean } {

    let convertedDate = "invalid", convertedTime = "invalid", isSecondArgInputted = true, isRelativeTimeExtensionTooShort = false;

    const monthOrWeekdayRegex = /^[A-Za-z']+([-+][-+\dA-Za-z]+)?$/;
    const shortDateRegex = /^([\d]{1,2})\/([\d]{1,2})$/;
    const longDateRegex = /^([\d]{1,2})\/([\d]{1,2})\/([\d]{2}|[\d]{4})$/;
    const shortTimeRegex = /^[\d]{1,2}[hH]?$/;
    const longTimeRegex = /^([\d]{1,2}):([\d]{2})$/;

    // the first arg is certainly part of the absolute time definition, and it may be a date or a time
    if (monthOrWeekdayRegex.test(dateOrTimeArg)) {
        // referring to a month or weekday by name. optionally also adding a relative time at the end >= 1d. units < 1d will be dropped.
        // example: sun, dec, tue+2d, thu+2w1d
        const [absolutePart, ...relativePart] = dateOrTimeArg.split(/(?=[-+])/);
        let result: moment.Moment;
        // start by parsing the absolute part
        switch (absolutePart.toLowerCase()) {
            // some weekday
            case "sunday": case "sun": result = getNextWeekday(0, now); break;
            case "monday": case "mon": result = getNextWeekday(1, now); break;
            case "tuesday": case "tue": case "tues": result = getNextWeekday(2, now); break;
            case "wednesday": case "wed": case "we'd": result = getNextWeekday(3, now); break;
            case "thursday": case "thu": case "thur": result = getNextWeekday(4, now); break;
            case "friday": case "fri": result = getNextWeekday(5, now); break;
            case "saturday": case "sat": result = getNextWeekday(6, now); break;
            case "today": case "td": case "tdy": result = moment(now); break;
            case "tomorrow": case "tm": case "tmr": case "tmrw": result = moment(now).add(1, "day"); break;
            // day 1 of some month
            case "january": case "jan": result = getNextMonth(0, now); break;
            case "february": case "feb": result = getNextMonth(1, now); break;
            case "march": case "mar": result = getNextMonth(2, now); break;
            case "april": case "apr": result = getNextMonth(3, now); break;
            case "may": result = getNextMonth(4, now); break;
            case "june": case "jun": result = getNextMonth(5, now); break;
            case "july": case "jul": result = getNextMonth(6, now); break;
            case "august": case "aug": result = getNextMonth(7, now); break;
            case "september": case "sep": case "sept": result = getNextMonth(8, now); break;
            case "october": case "oct": result = getNextMonth(9, now); break;
            case "november": case "nov": result = getNextMonth(10, now); break;
            case "december": case "dec": result = getNextMonth(11, now); break;
            // default -> date stays invalid
        }
        // now add the optional relative part
        if (result && relativePart && relativePart.length > 0) {
            const relativeTime = parseRelativeTime(result, relativePart.join(""), tz);
            if (relativeTime.valid) {
                isRelativeTimeExtensionTooShort = relativeTime.timeValues.h != null || relativeTime.timeValues.m != null || relativeTime.timeValues.s != null;
                result = isRelativeTimeExtensionTooShort ? null : relativeTime.date; // null = date stays invalid
            } else {
                // date stays invalid
                result = null;
            }
        }
        if (result) {
            convertedDate = result.format("DD/MM/YYYY");
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
    return { converted: `${convertedDate} ${convertedTime}`, isSecondArgInputted: isSecondArgInputted, isRelativeTimeExtensionTooShort };
}

// weekdays 0-6
function getNextWeekday(weekday: number, now: moment.Moment) {
    const currentWeekday = now.weekday();
    return moment(now).add(weekday > currentWeekday ? weekday - currentWeekday : weekday + 7 - currentWeekday, "day");
}

// months 0-11
function getNextMonth(month: number, now: moment.Moment) {
    const currentMonth = now.month();
    return moment(now).set("date", 1).add(month > currentMonth ? month - currentMonth : month + 12 - currentMonth, "month");
}

function zeroPad(n: number | string) {
    const parsed = typeof n === "number" ? n : parseInt(n);
    return parsed < 10 ? `0${parsed}` : `${parsed}`;
}

function yearPad(n: number | string) {
    const parsed = typeof n === "number" ? n : parseInt(n);
    return parsed < 10 ? `200${parsed}` : parsed < 100 ? `20${parsed}` : `${parsed}`;
}
