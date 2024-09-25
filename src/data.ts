import * as db from './firebase-module';

export type Reminder = {
    isPeriodic: boolean, // periodic? if yes, should renew once announced
    text: string, // reminder message
    timestamp: number, // unix time (ms) of target date
    authorId: string, // user to be pinged
    channelId: string, // destination channel
    id: number,
    rawTime?: string, // used for periodic reminders
    timeValues?: { [unit: string]: number } // used to renew a periodic reminder
}

let reminders: { [key: string]: Reminder } = {};
let lastReminderMessage: string | undefined = undefined;

let latestId: number = -1;
const maxId: number = 5000;

let timezone: string;

export async function init(): Promise<void> {
    db.connect(process.env.FIREBASE_CREDENTIALS, process.env.FIREBASE_URL);
    await loadImmediate();
}

/**
 * Refreshes and loads everything.
 */
export async function loadImmediate(): Promise<void> {
    reminders = await db.get("reminders/") ?? {};
    lastReminderMessage = await db.get("reminderconfig/last/");
    latestId = await db.get("reminderconfig/latestId");
    timezone = await db.get("reminderconfig/timezone") ?? process.env.OWNER_TIMEZONE;
}

/**
 * Saves everything.
 */
export async function saveImmediate(): Promise<void> {
    await db.post("reminders/", reminders);
}

export async function saveReminder(reminder: Reminder): Promise<string> {
    return await db.push("reminders/", reminder);
}

export async function saveReminders(reminders: { [key: string]: Reminder }): Promise<void> {
    await db.post("reminders/", reminders);
}

export async function deleteReminder(key: string): Promise<void> {
    await db.remove(`reminders/${key}`);
}

export function getReminders(): { [key: string]: Reminder } {
    return reminders;
}

export async function setReminder(reminder: Reminder): Promise<void> {
    reminders[await saveReminder(reminder)] = reminder;
}

export async function setLastReminderMessage(message: string): Promise<void> {
    lastReminderMessage = message;
    await db.post("reminderconfig/last/", message);
}

export function getLastReminderMessage(): string | undefined {
    return lastReminderMessage;
}

export async function setTimezone(tz: string): Promise<void> {
    timezone = tz;
    await db.post("reminderconfig/timezone", tz);
}

export function getTimezone(): string {
    return timezone;
}

export async function generateId(): Promise<number> {
    const newId = (++latestId) % (maxId + 1);
    await db.post("reminderconfig/latestId", newId);
    return newId;
}