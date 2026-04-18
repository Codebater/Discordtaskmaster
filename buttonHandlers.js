const {
  ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
  StringSelectMenuBuilder, StringSelectMenuOptionBuilder,
  ButtonBuilder, ButtonStyle, EmbedBuilder
} = require('discord.js');
const taskManager = require('./taskManager');
const { updateListMessage, showSettingsPanel } = require('./commands');
const { buildTaskDetailEmbed } = require('./embedBuilder');

// Helper: build task picker select menu
function taskPicker(tasks, action, placeholder) {
  const options = tasks.slice(0, 25).map((t, i) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${i + 1}. ${t.title.slice(0, 80)}`)
      .setValue(`${action}:${t.id}`)
      .setDescription(t.deadline ? `Due: ${t.deadline.slice(0, 10)}` : 'No deadline')
  );
  return new StringSelectMenuBuilder()
    .setCustomId(`taskSelect:${action}`)
    .setPlaceholder(placeholder)
    .addOptions(options);
}

const handlers = {

  // ─── Add Task ─────────────────────────────────────────────────────────────
  addTask: async (interaction, [_sub]) => {
    const modal = new ModalBuilder()
      .setCustomId('addTaskModal:new')
      .setTitle('➕ Add New Task');

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('title').setLabel('Task Title').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('description').setLabel('Description (optional)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('assignees').setLabel('Assign to (user IDs or @mentions)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('e.g. @John @Maria or 123456789,987654321')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('deadline').setLabel('Deadline (YYYY-MM-DD or YYYY-MM-DD HH:MM)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('2025-12-31 17:00')
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('reminder').setLabel('Daily reminder? (yes/no)').setStyle(TextInputStyle.Short).setRequired(false).setPlaceholder('yes')
      )
    );
    await interaction.showModal(modal);
  },

  // ─── Complete Task ─────────────────────────────────────────────────────────
  completeTask: async (interaction, [sub]) => {
    if (sub === 'pick') {
      const { tasks } = taskManager.getGuildTasks(interaction.guild.id);
      const open = tasks.filter(t => !t.done);
      if (!open.length) return interaction.reply({ content: 'No open tasks!', ephemeral: true });

      const select = taskPicker(open, 'complete', 'Select a task to complete…');
      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({ content: '✅ Which task is done?', components: [row], ephemeral: true });
    }
  },

  // ─── Edit Task ─────────────────────────────────────────────────────────────
  editTask: async (interaction, [sub, taskId]) => {
    if (sub === 'pick') {
      const { tasks } = taskManager.getGuildTasks(interaction.guild.id);
      const open = tasks.filter(t => !t.done);
      if (!open.length) return interaction.reply({ content: 'No open tasks!', ephemeral: true });

      const select = taskPicker(open, 'edit', 'Select a task to edit…');
      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({ content: '✏️ Which task do you want to edit?', components: [row], ephemeral: true });
    } else if (taskId) {
      const task = taskManager.getTask(interaction.guild.id, taskId);
      if (!task) return interaction.reply({ content: 'Task not found.', ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`editTaskModal:${taskId}`)
        .setTitle('✏️ Edit Task');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('title').setLabel('Task Title').setStyle(TextInputStyle.Short).setRequired(true).setValue(task.title)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('description').setLabel('Description').setStyle(TextInputStyle.Paragraph).setRequired(false).setValue(task.description || '')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('deadline').setLabel('Deadline (YYYY-MM-DD HH:MM)').setStyle(TextInputStyle.Short).setRequired(false).setValue(task.deadline ? task.deadline.slice(0, 16).replace('T', ' ') : '')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reminder').setLabel('Daily reminder? (yes/no)').setStyle(TextInputStyle.Short).setRequired(false).setValue(task.reminder ? 'yes' : 'no')
        )
      );
      await interaction.showModal(modal);
    }
  },

  // ─── Delete Task ───────────────────────────────────────────────────────────
  deleteTask: async (interaction, [sub]) => {
    if (sub === 'pick') {
      const { tasks } = taskManager.getGuildTasks(interaction.guild.id);
      const open = tasks.filter(t => !t.done);
      if (!open.length) return interaction.reply({ content: 'No tasks to delete!', ephemeral: true });

      const select = taskPicker(open, 'delete', 'Select a task to delete…');
      const row = new ActionRowBuilder().addComponents(select);
      await interaction.reply({ content: '🗑️ Which task do you want to delete?', components: [row], ephemeral: true });
    }
  },

  // ─── View Task ────────────────────────────────────────────────────────────
  viewTask: async (interaction, [sub]) => {
    if (sub === 'pick') {
      const { tasks } = taskManager.getGuildTasks(interaction.guild.id);
      if (!tasks.length) return interaction.reply({ content: 'No tasks yet!', ephemeral: true });
      const options = tasks.slice(0, 25).map(t =>
        new StringSelectMenuOptionBuilder()
          .setLabel(`${t.done ? '✅' : '📋'} ${t.title.slice(0, 75)}`)
          .setValue(`view:${t.id}`)
          .setDescription(t.done ? 'Completed' : (t.deadline ? `Due: ${t.deadline.slice(0, 10)}` : 'No deadline'))
      );
      const select = new StringSelectMenuBuilder()
        .setCustomId('taskSelect:view')
        .setPlaceholder('Select a task to view…')
        .addOptions(options);
      await interaction.reply({ content: '👁️ Which task do you want to view?', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
    }
  },

  // ─── Assign Task ──────────────────────────────────────────────────────────
  assignTask: async (interaction, [sub]) => {
    if (sub === 'pick') {
      const { tasks } = taskManager.getGuildTasks(interaction.guild.id);
      const open = tasks.filter(t => !t.done);
      if (!open.length) return interaction.reply({ content: 'No open tasks to assign!', ephemeral: true });
      const select = taskPicker(open, 'assign', 'Select a task to assign members…');
      await interaction.reply({ content: '👥 Which task do you want to assign?', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
    }
  },

  // ─── Settings ─────────────────────────────────────────────────────────────
  settings: async (interaction, [sub]) => {
    if (sub === 'open') {
      await showSettingsPanel(interaction);
      return;
    }

    if (sub === 'timezone') {
      const modal = new ModalBuilder().setCustomId('settingsModal:timezone').setTitle('🌍 Set Server Timezone');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('timezone').setLabel('Timezone (e.g. Europe/Berlin, America/New_York)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('UTC')
        )
      );
      await interaction.showModal(modal);
    }

    if (sub === 'hours') {
      const s = taskManager.getGuildSettings(interaction.guild.id);
      const modal = new ModalBuilder().setCustomId('settingsModal:hours').setTitle('🕘 Set Working Hours');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('workStart').setLabel('Work Start (HH:MM in 24h)').setStyle(TextInputStyle.Short).setRequired(true).setValue(s.workStart)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('workEnd').setLabel('Work End (HH:MM in 24h)').setStyle(TextInputStyle.Short).setRequired(true).setValue(s.workEnd)
        )
      );
      await interaction.showModal(modal);
    }

    if (sub === 'days') {
      const s = taskManager.getGuildSettings(interaction.guild.id);
      const modal = new ModalBuilder().setCustomId('settingsModal:days').setTitle('📅 Set Work Days');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('workDays').setLabel('Work days (0=Sun,1=Mon,...6=Sat, comma sep)').setStyle(TextInputStyle.Short).setRequired(true).setValue((s.workDays || [1,2,3,4,5]).join(','))
        )
      );
      await interaction.showModal(modal);
    }

    if (sub === 'display') {
      const s = taskManager.getGuildSettings(interaction.guild.id);
      const modal = new ModalBuilder().setCustomId('settingsModal:display').setTitle('📊 Display Settings');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('barLength').setLabel('Progress bar length (blocks, 8–24)').setStyle(TextInputStyle.Short).setRequired(true).setValue(String(s.barLength ?? 16))
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('donePreviewCount').setLabel('Completed tasks shown on main board (1–10)').setStyle(TextInputStyle.Short).setRequired(true).setValue(String(s.donePreviewCount ?? 3))
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('doneListShowCount').setLabel('Max tasks shown on done board (5–50)').setStyle(TextInputStyle.Short).setRequired(true).setValue(String(s.doneListShowCount ?? 10))
        )
      );
      await interaction.showModal(modal);
    }

    if (sub === 'mytz') {
      const modal = new ModalBuilder().setCustomId('settingsModal:mytz').setTitle('👤 My Personal Timezone');
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('timezone').setLabel('Your timezone (e.g. Asia/Tokyo)').setStyle(TextInputStyle.Short).setRequired(true).setPlaceholder('UTC')
        )
      );
      await interaction.showModal(modal);
    }
  },
};

module.exports = handlers;
