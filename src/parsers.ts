import * as moment from 'moment-timezone';

export type RelativeTime = { 
    valid: boolean, 
    date?: moment.Moment, 
    timeValues?: { [unit: string]: number } 
};

export type AbsoluteTime = {
    valid: boolean, 
    date?: moment.Moment, 
    isTimeInputted?: boolean
}

export function parseRelativeTime(start: moment.Moment, relativeTime: string, tz: string): RelativeTime {
    const tokens = relativeTime.match(/[0-9]+|[A-Za-z]+/g) ?? [,];
    const timeValues: { [unit: string]: number } = {};

    for (let i = 0; i < tokens.length; i += 2) {
        let value: number;

        if (i + 1 >= tokens.length || timeValues[tokens[i + 1]] != undefined || isNaN(value = Number(tokens[i])) || value <= 0) {
            return { valid: false };
        }

        timeValues[tokens[i + 1]] = value;
    }

    const date = moment(start).tz(tz);

    for (const unit in timeValues) {
        const value = timeValues[unit];
        switch (unit) {
            case "year": case "y": date.add(value, "year"); break;
            case "month": case "mo": date.add(value, "month"); break;
            case "week": case "w": date.add(value, "week"); break;
            case "day": case "d": date.add(value, "day"); break;
            case "hour": case "h": date.add(value, "hour"); break;
            case "minute": case "m": date.add(value, "minute"); break;
            default: return { valid: false };
        }
    }

    return { valid: true, date, timeValues };
}

export function parseAbsoluteTime(dateArg: string, timeArg: string | undefined, now: moment.Moment, tz: string): AbsoluteTime {
    const { converted, isTimeInputted } = convertAbsoluteTimeRawInput(dateArg, timeArg, now);

    if (!/[\d]{2}\/[\d]{2}\/[\d]{4} [\d]{2}:[\d]{2}/g.test(converted)) {
        return { valid: false };
    }

    const date = moment.tz(converted, "DD/MM/YYYY HH:mm", tz);

    return { valid: true, date, isTimeInputted };
}

function convertAbsoluteTimeRawInput(dateArg: string, timeArg: string | undefined, now: moment.Moment): { converted: string, isTimeInputted: boolean } {
    let convertedDate = "invalid", convertedTime = "invalid", isTimeInputted = true;

    const weekdayRegex = /^[A-Za-z]+$/;
    const shortDateRegex = /^([\d]{1,2})\/([\d]{1,2})$/;
    const longDateRegex = /^([\d]{1,2})\/([\d]{1,2})\/([\d]{4})$/;
    const shortTimeRegex = /^[\d]{1,2}[hH]$/;
    const longTimeRegex = /^([\d]{1,2}):([\d]{2})$/;

    if (weekdayRegex.test(dateArg)) {
        let targetWeekday: number;
        switch (dateArg.toLowerCase()) {
            case "sun": case "sunday": targetWeekday = 0; break;
            case "mon": case "monday": targetWeekday = 1; break;
            case "tue": case "tuesday": targetWeekday = 2; break;
            case "wed": case "wednesday": targetWeekday = 3; break;
            case "thu": case "thursday": targetWeekday = 4; break;
            case "fri": case "friday": targetWeekday = 5; break;
            case "sat": case "saturday": targetWeekday = 6; break;
            case "today": targetWeekday = -2; break;
            default: targetWeekday = -1;
        }
        if (targetWeekday === -1) {
            convertedDate = "invalid";
        } else if (targetWeekday === -2) {
            convertedDate = moment(now).format("DD/MM/YYYY");
        } else {
            const currentWeekday = now.weekday();
            convertedDate = moment(now).add(targetWeekday > currentWeekday ? targetWeekday - currentWeekday : targetWeekday + 7 - currentWeekday, "d").format("DD/MM/YYYY");
        }
    } else if (shortDateRegex.test(dateArg)) {
        // 06/06 or 2/7
        const match = dateArg.match(shortDateRegex);
        convertedDate = `${zeroPad(match[1])}/${zeroPad(match[2])}/${now.year()}`;
    } else if (longDateRegex.test(dateArg)) {
        // 04/06/2025 or 7/6/2025
        const match = dateArg.match(longDateRegex);
        convertedDate = `${zeroPad(match[1])}/${zeroPad(match[2])}/${zeroPad(match[3])}`;
    }

    if (shortTimeRegex.test(timeArg)) {
        // 8h or 14h
        convertedTime = `${zeroPad(timeArg)}:00`;
    } else if (longTimeRegex.test(timeArg)) {
        // 04:00 or 7:15
        const match = timeArg.match(longTimeRegex);
        convertedTime = `${zeroPad(match[1])}:${match[2]}`;
    } else {
        // no time supplied
        convertedTime = "06:00";
        isTimeInputted = false;
    }

    return { converted: `${convertedDate} ${convertedTime}`, isTimeInputted };
}

function zeroPad(n: number | string) {
    const parsed = typeof n === "number" ? n : parseInt(n);
    return parsed < 10 ? `0${parsed}` : `${parsed}`;
}
