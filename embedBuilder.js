const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ─── Progress bar builder ──────────────────────────────────────────────────────
// Returns a Unicode block bar + percentage text, e.g. "█████░░░░░ 50%"
function buildProgressBar(done, total, length = 16) {
  if (total === 0) return '`░'.repeat(length) + '` **0%**';
  const pct = Math.round((done / total) * 100);
  const filled = Math.round((done / total) * length);
  const empty = length - filled;

  // Pick bar color emoji based on progress
  let label;
  if (pct === 100) label = '🎉';
  else if (pct >= 75) label = '🟢';
  else if (pct >= 40) label = '🟡';
  else label = '🔴';

  const bar = '`' + '█'.repeat(filled) + '░'.repeat(empty) + '`';
  return `${label} ${bar} **${pct}%** — ${done}/${total} done`;
}

// ─── Done list embed (separate message) ───────────────────────────────────────
function buildDoneEmbed(tasks, settings) {
  const done = tasks.filter(t => t.done);
  const total = tasks.length;
  const showCount = settings.doneListShowCount ?? 10;

  const embed = new EmbedBuilder()
    .setTitle('✅ Completed Tasks')
    .setColor(0x57F287)
    .setTimestamp()
    .setFooter({ text: `Showing last ${showCount} · ${done.length} total completed` });

  if (done.length === 0) {
    embed.setDescription('> No completed tasks yet. Get to work! 💪');
    return embed;
  }

  // Sort by completedAt descending, show most recent first
  const recent = [...done]
    .sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))
    .slice(0, showCount);

  const lines = recent.map((t, i) => {
    const num = `\`${String(i + 1).padStart(2, '0')}\``;
    const ts = t.completedAt
      ? ` · <t:${Math.floor(new Date(t.completedAt).getTime() / 1000)}:d>`
      : '';
    const assignees = t.assignees?.length
      ? ` · 👤 ${t.assignees.map(id => `<@${id}>`).join(' ')}`
      : '';
    return `${num} ~~${t.title}~~${assignees}${ts}`;
  });

  embed.setDescription(lines.join('\n'));

  // Progress bar inside done embed too
  embed.addFields({
    name: '📊 Overall Progress',
    value: buildProgressBar(done.length, total),
    inline: false,
  });

  return embed;
}

// ─── Main task board embed ─────────────────────────────────────────────────────
function buildTaskListEmbed(guildData, guildSettings) {
  const tasks = guildData.tasks || [];
  const open = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const total = tasks.length;

  // Dynamic color: green when all done, yellow when progressing, blurple default
  let color = 0x5865F2;
  if (total > 0 && done.length === total) color = 0x57F287;
  else if (total > 0 && done.length > 0) color = 0xFEE75C;

  const embed = new EmbedBuilder()
    .setTitle('✨ Task Board')
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: `${open.length} open · ${done.length} completed · updated · /donate to support` });

  if (total === 0) {
    embed.setDescription('> No tasks yet. Click **➕ Add Task** to get started!');
    return { embeds: [embed], components: buildListButtons([], []) };
  }

  // ── Progress bar at the top ──
  embed.setDescription(buildProgressBar(done.length, total));

  // ── Open tasks ──
  if (open.length > 0) {
    const lines = open.map((t, i) => {
      const num = `\`${String(i + 1).padStart(2, '0')}\``;
      const assignees = t.assignees?.length
        ? ` · 👤 ${t.assignees.map(id => `<@${id}>`).join(' ')}`
        : '';
      const deadline = t.deadline
        ? ` · ⏰ <t:${Math.floor(new Date(t.deadline).getTime() / 1000)}:d>`
        : '';
      const reminder = t.reminder ? ' · 🔔' : '';
      return `${num} ☐ **${t.title}**${assignees}${deadline}${reminder}`;
    });
    embed.addFields({ name: '📋 Open', value: lines.join('\n'), inline: false });
  } else {
    embed.addFields({ name: '📋 Open', value: '> All done! 🎉', inline: false });
  }

  // ── Inline done summary (compact, links to done board) ──
  if (done.length > 0) {
    const previewCount = guildSettings.donePreviewCount ?? 3;
    const recent = [...done]
      .sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0))
      .slice(0, previewCount);
    const lines = recent.map(t => `~~${t.title}~~`);
    if (done.length > previewCount) lines.push(`_…and ${done.length - previewCount} more (see Done Board)_`);
    embed.addFields({ name: `✅ Recently completed`, value: lines.join('\n'), inline: false });
  }

  return { embeds: [embed], components: buildListButtons(open, tasks) };
}

// ─── Buttons ───────────────────────────────────────────────────────────────────
function buildListButtons(openTasks = [], allTasks = []) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('addTask:new')
      .setLabel('➕ Add Task')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('completeTask:pick')
      .setLabel('✅ Complete')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(openTasks.length === 0),
    new ButtonBuilder()
      .setCustomId('editTask:pick')
      .setLabel('✏️ Edit')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(openTasks.length === 0),
    new ButtonBuilder()
      .setCustomId('deleteTask:pick')
      .setLabel('🗑️ Delete')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(openTasks.length === 0),
    new ButtonBuilder()
      .setCustomId('settings:open')
      .setLabel('⚙️ Settings')
      .setStyle(ButtonStyle.Secondary),
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('viewTask:pick')
      .setLabel('👁️ View')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(allTasks.length === 0),
    new ButtonBuilder()
      .setCustomId('assignTask:pick')
      .setLabel('👥 Assign')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(openTasks.length === 0),
  );
  return [row1, row2];
}

function buildTaskDetailEmbed(task) {
  const embed = new EmbedBuilder()
    .setTitle(`📌 ${task.title}`)
    .setColor(task.done ? 0x57F287 : 0x5865F2)
    .setTimestamp(new Date(task.createdAt));

  const fields = [];
  if (task.description) fields.push({ name: '📝 Description', value: task.description, inline: false });
  if (task.assignees?.length) fields.push({ name: '👤 Assigned To', value: task.assignees.map(id => `<@${id}>`).join(', '), inline: true });
  if (task.deadline) fields.push({ name: '⏰ Deadline', value: `<t:${Math.floor(new Date(task.deadline).getTime() / 1000)}:F>`, inline: true });
  if (task.reminder) fields.push({ name: '🔔 Reminder', value: 'Daily until deadline', inline: true });
  fields.push({ name: '📊 Status', value: task.done ? '✅ Completed' : '🔄 In Progress', inline: true });
  embed.addFields(fields);
  return embed;
}

module.exports = { buildTaskListEmbed, buildDoneEmbed, buildTaskDetailEmbed, buildListButtons };
