import * as db from './firebase-module';

export type Reminder = {
    isPeriodic: boolean, // periodic? if yes, should renew once announced
    text: string, // reminder message
    timestamp: number, // unix time (ms) of target date
    authorId: string, // user to be pinged
    channelId: string, // destination channel
    id: number,
    times?: number; // limits the renewal of periodic reminders
    rawTime?: string, // used for periodic reminders
    timeValues?: { [unit: string]: number } // used to renew a periodic reminder
}

let reminders: { [key: string]: Reminder } = {};
let latestReminders: { id: number, message: string }[] = [];

let latestId: number = -1;
const maxId: number = 5000;
const maxLatestRemindersLength = 20;

let timezone: string;
let preferredChannel: string;

export async function init(): Promise<void> {
    db.connect(process.env.FIREBASE_CREDENTIALS, process.env.FIREBASE_URL);
    await loadImmediate();
}

/**
 * Refreshes and loads everything.
 */
export async function loadImmediate(): Promise<void> {
    reminders = await db.get("reminders/") ?? {};
    latestReminders = await db.get("reminderconfig/latest") ?? [];
    latestId = await db.get("reminderconfig/latestId");
    timezone = await db.get("reminderconfig/timezone") ?? process.env.OWNER_TIMEZONE;
    preferredChannel = await db.get("reminderconfig/channel");
}

/**
 * Saves everything.
 */
export async function saveImmediate(): Promise<void> {
    await db.post("reminders/", reminders);
}

export async function updateReminder(key: string, reminderFields: Partial<Reminder>): Promise<void> {
    return await db.update(`reminders/${key}`, reminderFields);
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

export async function setLatestReminderMessage(id: number, message: string): Promise<void> {
    latestReminders.push({id, message});
    while (latestReminders.length > maxLatestRemindersLength) {
        latestReminders.shift();
    }
    await db.post("reminderconfig/latest", latestReminders);
}

export function getLatestReminderMessage(id: number | null): { id: number, message: string } | undefined {
    return id != null ? latestReminders.find(r => r.id === id) : latestReminders[latestReminders.length - 1];
}

export async function setTimezone(tz: string): Promise<void> {
    timezone = tz;
    await db.post("reminderconfig/timezone", tz);
}

export function getTimezone(): string {
    return timezone;
}

export async function setPreferredChannel(channel: string | null | undefined): Promise<void> {
    preferredChannel = channel;
    await db.post("reminderconfig/channel", channel ?? null);
}

export function getPreferredChannel(): string | null {
    return preferredChannel;
}

export async function generateId(): Promise<number> {
    const newId = (++latestId) % (maxId + 1);
    await db.post("reminderconfig/latestId", newId);
    return newId;
}

export function getLatestId(): number {
    return latestId;
}
