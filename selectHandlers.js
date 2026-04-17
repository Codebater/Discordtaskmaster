const taskManager = require('./taskManager');
const { updateListMessage } = require('./commands');

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
      // Trigger the edit modal
      const buttonHandlers = require('./buttonHandlers');
      await buttonHandlers.editTask(interaction, ['detail', taskId]);
    }
  }
};

module.exports = handlers;
