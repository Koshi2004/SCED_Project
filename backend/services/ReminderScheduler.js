const cron = require('node-cron');
const { pool } = require('../config/mysql');
const EmailService = require('./EmailService');

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_MINUTE_MS = 60 * 1000;
const WINDOW_HALF_MS = 2 * ONE_MINUTE_MS;

class ReminderScheduler {
    constructor() {
        this.cronExpression = process.env.REMINDER_CRON || '* * * * *';
        this.maxCatchupMs = Number(process.env.REMINDER_MAX_CATCHUP_HOURS || 48) * ONE_HOUR_MS;

        this.isRunning = false;

        this.reminders = [
            { leadMs: 24 * ONE_HOUR_MS, field: 'reminder_24_sent', label: '24 hours', explicitKey: '1_day' },
            { leadMs: 12 * ONE_HOUR_MS, field: 'reminder_12_sent', label: '12 hours', explicitKey: '12_hours' },
            { leadMs: 6 * ONE_HOUR_MS, field: 'reminder_6_sent', label: '6 hours', explicitKey: '6_hours' },
            { leadMs: 1 * ONE_HOUR_MS, field: 'reminder_1_sent', label: '1 hour', explicitKey: '1_hour' },
            { leadMs: 30 * ONE_MINUTE_MS, field: 'reminder_30m_sent', label: '30 minutes', explicitKey: '30_minutes' },
            { leadMs: 10 * ONE_MINUTE_MS, field: 'reminder_10m_sent', label: '10 minutes', explicitKey: '10_minutes' },
        ];

        this.priorityRules = {
            high: new Set(['24 hours', '12 hours', '6 hours', '1 hour', '30 minutes', '10 minutes']),
            medium: new Set(['24 hours', '6 hours', '1 hour', '10 minutes']),
            low: new Set(['24 hours', '6 hours', '10 minutes']),
        };
    }

    normalizeReminderValue(value) {
        return String(value || '').trim().toLowerCase();
    }

    shouldSendForTask(task, reminder) {
        const explicit = this.normalizeReminderValue(task.remind_before);
        if (explicit) {
            return explicit === reminder.explicitKey;
        }

        const priority = this.normalizeReminderValue(task.priority);
        const rules = this.priorityRules[priority] || this.priorityRules.medium;
        return rules.has(reminder.label);
    }

    async sendDueReminder(now, reminder) {
        const windowStart = new Date(now.getTime() - this.maxCatchupMs + reminder.leadMs);
        const windowEnd = new Date(now.getTime() + WINDOW_HALF_MS + reminder.leadMs);

        const [tasks] = await pool.query(
            `SELECT * FROM todos
            WHERE status = 'upcoming'
            AND deadline >= ?
            AND deadline <= ?
            AND ${reminder.field} = 0`,
            [windowStart, windowEnd],
        );

        for (const task of tasks) {
            if (!this.shouldSendForTask(task, reminder)) {
                continue;
            }

            const deadline = new Date(task.deadline);
            const createdAt = new Date(task.created_at);
            const updatedAt = new Date(task.updated_at);
            const reminderTarget = new Date(deadline.getTime() - reminder.leadMs);
            const reminderTargetWithWindow = new Date(reminderTarget.getTime() + WINDOW_HALF_MS);
            const anchorAt = !Number.isNaN(updatedAt.getTime()) ? updatedAt : createdAt;

            if (!Number.isNaN(anchorAt.getTime()) && anchorAt > reminderTargetWithWindow) {
                continue;
            }

            try {
                await EmailService.sendReminder(task, reminder.label);
                await pool.query(
                    `UPDATE todos SET ${reminder.field} = 1 WHERE id = ?`,
                    [task.id],
                );
                console.log(`[ReminderScheduler] Sent ${reminder.label} reminder for event ${task.id}`);
            } catch (err) {
                await pool.query(
                    'UPDATE todos SET reminder_failed_count = reminder_failed_count + 1 WHERE id = ?',
                    [task.id],
                );
                console.error(`[ReminderScheduler] Failed reminder for event ${task.id}:`, err.message);
            }
        }
    }

    async checkAndSendReminders() {
        if (this.isRunning) return;
        this.isRunning = true;

        try {
            const now = new Date();
            for (const reminder of this.reminders) {
                await this.sendDueReminder(now, reminder);
            }
        } finally {
            this.isRunning = false;
        }
    }

    start() {
        if (!cron.validate(this.cronExpression)) {
            throw new Error(`Invalid REMINDER_CRON expression: ${this.cronExpression}`);
        }

        cron.schedule(this.cronExpression, () => this.checkAndSendReminders(), {
            scheduled: true,
            timezone: process.env.TZ || 'Asia/Colombo',
        });

        this.checkAndSendReminders().catch((err) => {
            console.error('[ReminderScheduler] Startup reminder check failed:', err.message);
        });

        console.log(`[ReminderScheduler] Started with cron "${this.cronExpression}"`);
    }
}

const scheduler = new ReminderScheduler();

const boundCheckAndSendReminders = scheduler.checkAndSendReminders.bind(scheduler);

module.exports = scheduler;

module.exports.startScheduler = () => scheduler.start();
module.exports.checkAndSendReminders = boundCheckAndSendReminders;