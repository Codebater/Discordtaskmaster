const { UserSelectMenuBuilder, ActionRowBuilder } = require('discord.js');
const taskManager = require('./taskManager');
const { updateListMessage } = require('./commands');
const { buildTaskDetailEmbed } = require('./embedBuilder');

const handlers = {
  taskSelect: async (interaction, [action]) => {
    // Value format: "action:taskId"
    const value = interaction.values[0];
    const [act, taskId] = value.split(':');

    const guildId = interaction.guild.id;

    if (act === 'complete') {
      const task = taskManager.getTask(guildId, taskId);
      if (!task) return interaction.reply({ content: '❌ Task not found.', ephemeral: true });
      taskManager.updateTask(guildId, taskId, { done: true, completedAt: new Date().toISOString() });
      await updateListMessage(interaction.guild);
      await interaction.update({ content: `✅ **"${task.title}"** marked as complete!`, components: [], embeds: [] });
    }

    if (act === 'delete') {
      const task = taskManager.getTask(guildId, taskId);
      if (!task) return interaction.reply({ content: '❌ Task not found.', ephemeral: true });
      taskManager.deleteTask(guildId, taskId);
      await updateListMessage(interaction.guild);
      await interaction.update({ content: `🗑️ **"${task.title}"** deleted.`, components: [], embeds: [] });
    }

    if (act === 'edit') {
      const buttonHandlers = require('./buttonHandlers');
      await buttonHandlers.editTask(interaction, ['detail', taskId]);
    }

    if (act === 'view') {
      const task = taskManager.getTask(guildId, taskId);
      if (!task) return interaction.reply({ content: '❌ Task not found.', ephemeral: true });
      await interaction.update({ content: '', embeds: [buildTaskDetailEmbed(task)], components: [] });
    }

    if (act === 'assign') {
      const task = taskManager.getTask(guildId, taskId);
      if (!task) return interaction.reply({ content: '❌ Task not found.', ephemeral: true });
      const select = new UserSelectMenuBuilder()
        .setCustomId(`assignMembers:${taskId}`)
        .setPlaceholder('Select members to assign…')
        .setMinValues(0)
        .setMaxValues(10);
      await interaction.update({
        content: `👥 Select members to assign to **"${task.title}"**:`,
        components: [new ActionRowBuilder().addComponents(select)],
        embeds: [],
      });
    }
  },

  assignMembers: async (interaction, [taskId]) => {
    const guildId = interaction.guild.id;
    const userIds = [...interaction.users.keys()];
    const task = taskManager.getTask(guildId, taskId);
    if (!task) return interaction.reply({ content: '❌ Task not found.', ephemeral: true });
    taskManager.updateTask(guildId, taskId, { assignees: userIds });
    await updateListMessage(interaction.guild);
    const names = userIds.length ? userIds.map(id => `<@${id}>`).join(', ') : 'nobody';
    await interaction.update({ content: `👥 **"${task.title}"** assigned to ${names}`, components: [], embeds: [] });
  },
};

module.exports = handlers;
