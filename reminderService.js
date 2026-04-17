const taskManager = require('./taskManager');

// Check if current time is within working hours for a timezone
function isWorkingTime(timezone, workStart, workEnd, workDays) {
  try {
    const now = new Date();
    const localStr = now.toLocaleString('en-US', { timeZone: timezone, hour12: false });
    const local = new Date(localStr);
    const day = local.getDay();
    const hours = local.getHours();
    const minutes = local.getMinutes();
    const currentMinutes = hours * 60 + minutes;

    const [startH, startM] = workStart.split(':').map(Number);
    const [endH, endM] = workEnd.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    return workDays.includes(day) && currentMinutes >= startMinutes && currentMinutes < endMinutes;
  } catch {
    return true; // fallback: always send
  }
}

function isDeadlineExpired(deadline) {
  return new Date(deadline) < new Date();
}

// Track what we already reminded today (reset at midnight)
const sentToday = new Set();
let lastResetDay = new Date().getDate();

function resetIfNewDay() {
  const today = new Date().getDate();
  if (today !== lastResetDay) {
    sentToday.clear();
    lastResetDay = today;
  }
}

async function sendReminders(client) {
  resetIfNewDay();
  const allTasks = taskManager.getAllTasksWithDeadlines();

  for (const { guildId, task } of allTasks) {
    if (!task.reminder || task.done) continue;
    if (task.deadline && isDeadlineExpired(task.deadline)) continue;

    const settings = taskManager.getGuildSettings(guildId);

    // For each assignee, check their personal timezone or fall back to server tz
    for (const userId of (task.assignees || [])) {
      const key = `${guildId}:${task.id}:${userId}`;
      if (sentToday.has(key)) continue;

      const memberSettings = taskManager.getMemberSettings(guildId, userId);
      const tz = memberSettings?.timezone || settings.timezone;
      const workStart = memberSettings?.workStart || settings.workStart;
      const workEnd = memberSettings?.workEnd || settings.workEnd;
      const workDays = memberSettings?.workDays || settings.workDays;

      if (!isWorkingTime(tz, workStart, workEnd, workDays)) continue;

      try {
        const user = await client.users.fetch(userId);
        const deadlineTs = task.deadline
          ? `\n⏰ **Deadline:** <t:${Math.floor(new Date(task.deadline).getTime() / 1000)}:F>`
          : '';
        const daysLeft = task.deadline
          ? Math.ceil((new Date(task.deadline) - new Date()) / (1000 * 60 * 60 * 24))
          : null;

        let urgency = '🔔';
        if (daysLeft !== null) {
          if (daysLeft <= 1) urgency = '🚨';
          else if (daysLeft <= 3) urgency = '⚠️';
        }

        await user.send(
          `${urgency} **Task Reminder**\n` +
          `📌 **${task.title}**${deadlineTs}` +
          (task.description ? `\n📝 ${task.description}` : '') +
          (daysLeft !== null ? `\n📆 **${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining**` : '')
        );

        sentToday.add(key);
        console.log(`Reminded ${userId} about "${task.title}"`);
      } catch (e) {
        console.error(`Could not DM user ${userId}:`, e.message);
      }
    }

    // Also post to the list channel if reminder is set but no assignees
    if (!task.assignees?.length) {
      const key = `${guildId}:${task.id}:channel`;
      if (sentToday.has(key)) continue;
      if (!isWorkingTime(settings.timezone, settings.workStart, settings.workEnd, settings.workDays)) continue;

      try {
        const guildData = taskManager.getGuildTasks(guildId);
        if (!guildData.listChannelId) continue;
        const guild = await client.guilds.fetch(guildId);
        const channel = await guild.channels.fetch(guildData.listChannelId);
        await channel.send(`🔔 **Reminder:** Task **"${task.title}"** is due <t:${Math.floor(new Date(task.deadline).getTime() / 1000)}:R>`);
        sentToday.add(key);
      } catch {}
    }
  }
}

function start(client) {
  // Check every 15 minutes
  setInterval(() => sendReminders(client), 15 * 60 * 1000);
  // Also check shortly after startup
  setTimeout(() => sendReminders(client), 10 * 1000);
  console.log('⏰ Reminder service started');
}

module.exports = { start };
