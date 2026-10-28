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
            case "second": case "sec": case "s": date.add(value, "second"); break;
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

    const monthOrWeekdayRegex = /^[A-Za-z]+$/;
    const shortDateRegex = /^([\d]{1,2})\/([\d]{1,2})$/;
    const longDateRegex = /^([\d]{1,2})\/([\d]{1,2})\/([\d]{2}|[\d]{4})$/;
    const shortTimeRegex = /^[\d]{1,2}[hH]?$/;
    const longTimeRegex = /^([\d]{1,2}):([\d]{2})$/;

    // the first arg is certainly part of the absolute time definition, and it may be a date or a time

    if (monthOrWeekdayRegex.test(dateOrTimeArg)) {
        // referring to a month or weekday by name
        // example: sun, dec
        switch (dateOrTimeArg.toLowerCase()) {
            // some weekday
            case "sunday": case "sun": convertedDate = getNextWeekdayFormatted(0, now); break;
            case "monday": case "mon": convertedDate = getNextWeekdayFormatted(1, now); break;
            case "tuesday": case "tue": case "tues": convertedDate = getNextWeekdayFormatted(2, now); break;
            case "wednesday": case "wed": convertedDate = getNextWeekdayFormatted(3, now); break;
            case "thursday": case "thu": case "thur": convertedDate = getNextWeekdayFormatted(4, now); break;
            case "friday": case "fri": convertedDate = getNextWeekdayFormatted(5, now); break;
            case "saturday": case "sat": convertedDate = getNextWeekdayFormatted(6, now); break;
            case "today": case "td": case "tdy": convertedDate = moment(now).format("DD/MM/YYYY"); break;
            case "tomorrow": case "tm": case "tmr": case "tmrw": convertedDate = moment(now).add(1, "day").format("DD/MM/YYYY"); break;
            // day 1 of some month
            case "january": case "jan": convertedDate = getNextMonthFormatted(0, now); break;
            case "february": case "feb": convertedDate = getNextMonthFormatted(1, now); break;
            case "march": case "mar": convertedDate = getNextMonthFormatted(2, now); break;
            case "april": case "apr": convertedDate = getNextMonthFormatted(3, now); break;
            case "may": convertedDate = getNextMonthFormatted(4, now); break;
            case "june": case "jun": convertedDate = getNextMonthFormatted(5, now); break;
            case "july": case "jul": convertedDate = getNextMonthFormatted(6, now); break;
            case "august": case "aug": convertedDate = getNextMonthFormatted(7, now); break;
            case "september": case "sep": case "sept": convertedDate = getNextMonthFormatted(8, now); break;
            case "october": case "oct": convertedDate = getNextMonthFormatted(9, now); break;
            case "november": case "nov": convertedDate = getNextMonthFormatted(10, now); break;
            case "december": case "dec": convertedDate = getNextMonthFormatted(11, now); break;
            // default -> date stays invalid
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

// weekdays 0-6
function getNextWeekdayFormatted(weekday: number, now: moment.Moment) {
    const currentWeekday = now.weekday();
    return moment(now).add(weekday > currentWeekday ? weekday - currentWeekday : weekday + 7 - currentWeekday, "day").format("DD/MM/YYYY");
}

// months 0-11
function getNextMonthFormatted(month: number, now: moment.Moment) {
    const currentMonth = now.month();
    return moment(now).set("date", 1).add(month > currentMonth ? month - currentMonth : month + 12 - currentMonth, "month").format("DD/MM/YYYY");
}

function zeroPad(n: number | string) {
    const parsed = typeof n === "number" ? n : parseInt(n);
    return parsed < 10 ? `0${parsed}` : `${parsed}`;
}

function yearPad(n: number | string) {
    const parsed = typeof n === "number" ? n : parseInt(n);
    return parsed < 10 ? `200${parsed}` : parsed < 100 ? `20${parsed}` : `${parsed}`;
}
