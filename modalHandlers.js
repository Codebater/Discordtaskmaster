const taskManager = require('./taskManager');
const { updateListMessage, showSettingsPanel } = require('./commands');

function parseMentions(str) {
  if (!str) return [];
  const fromMentions = [...str.matchAll(/<@!?(\d+)>/g)].map(m => m[1]);
  if (fromMentions.length) return fromMentions;
  // Also support comma-separated IDs
  return str.split(/[\s,]+/).filter(s => /^\d+$/.test(s));
}

function parseDeadline(str) {
  if (!str || !str.trim()) return null;
  const d = new Date(str.trim().replace(' ', 'T'));
  return isNaN(d) ? null : d.toISOString();
}

const handlers = {

  addTaskModal: async (interaction, [_sub]) => {
    const title = interaction.fields.getTextInputValue('title').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    const assigneeStr = interaction.fields.getTextInputValue('assignees');
    const deadlineStr = interaction.fields.getTextInputValue('deadline');
    const reminderStr = interaction.fields.getTextInputValue('reminder').toLowerCase();

    const assignees = parseMentions(assigneeStr);
    const deadline = parseDeadline(deadlineStr);
    const reminder = reminderStr === 'yes' || reminderStr === 'y' || reminderStr === '1';

    taskManager.addTask(interaction.guild.id, { title, description, assignees, deadline, reminder });
    await updateListMessage(interaction.guild);
    await interaction.reply({ content: `✅ Task **"${title}"** added to the board!`, ephemeral: true });
  },

  editTaskModal: async (interaction, [taskId]) => {
    const title = interaction.fields.getTextInputValue('title').trim();
    const description = interaction.fields.getTextInputValue('description').trim();
    const assigneeStr = interaction.fields.getTextInputValue('assignees');
    const deadlineStr = interaction.fields.getTextInputValue('deadline');
    const reminderStr = interaction.fields.getTextInputValue('reminder').toLowerCase();

    const assignees = parseMentions(assigneeStr);
    const deadline = parseDeadline(deadlineStr);
    const reminder = reminderStr === 'yes' || reminderStr === 'y' || reminderStr === '1';

    taskManager.updateTask(interaction.guild.id, taskId, { title, description, assignees, deadline, reminder });
    await updateListMessage(interaction.guild);
    await interaction.reply({ content: `✏️ Task **"${title}"** updated!`, ephemeral: true });
  },

  settingsModal: async (interaction, [sub]) => {
    const guildId = interaction.guild.id;

    if (sub === 'timezone') {
      const timezone = interaction.fields.getTextInputValue('timezone').trim();
      taskManager.saveGuildSettings(guildId, { timezone });
      await interaction.reply({ content: `🌍 Server timezone set to **${timezone}**`, ephemeral: true });
    }

    if (sub === 'hours') {
      const workStart = interaction.fields.getTextInputValue('workStart').trim();
      const workEnd = interaction.fields.getTextInputValue('workEnd').trim();
      taskManager.saveGuildSettings(guildId, { workStart, workEnd });
      await interaction.reply({ content: `🕘 Working hours set to **${workStart} – ${workEnd}**`, ephemeral: true });
    }

    if (sub === 'days') {
      const raw = interaction.fields.getTextInputValue('workDays');
      const workDays = raw.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 0 && n <= 6);
      taskManager.saveGuildSettings(guildId, { workDays });
      const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      await interaction.reply({ content: `📅 Work days set to **${workDays.map(d => dayNames[d]).join(', ')}**`, ephemeral: true });
    }

    if (sub === 'display') {
      const barLength = Math.min(24, Math.max(8, parseInt(interaction.fields.getTextInputValue('barLength')) || 16));
      const donePreviewCount = Math.min(10, Math.max(1, parseInt(interaction.fields.getTextInputValue('donePreviewCount')) || 3));
      const doneListShowCount = Math.min(50, Math.max(5, parseInt(interaction.fields.getTextInputValue('doneListShowCount')) || 10));
      taskManager.saveGuildSettings(guildId, { barLength, donePreviewCount, doneListShowCount });
      // Refresh both boards to reflect new display settings
      try {
        const guild = interaction.guild;
        await updateListMessage(guild);
      } catch {}
      await interaction.reply({
        content: `📊 Display updated — bar: **${barLength}** blocks · done preview: **${donePreviewCount}** · done board: **${doneListShowCount}** tasks`,
        ephemeral: true,
      });
    }

    if (sub === 'mytz') {
      const timezone = interaction.fields.getTextInputValue('timezone').trim();
      taskManager.saveMemberSettings(guildId, interaction.user.id, { timezone });
      await interaction.reply({ content: `👤 Your personal timezone set to **${timezone}** — reminders will use this!`, ephemeral: true });
    }
  },
};

module.exports = handlers;
