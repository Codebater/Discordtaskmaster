const { REST, Routes, ApplicationCommandOptionType } = require('discord.js');

async function deployCommands(client) {
  const commands = [
    {
      name: 'tasklist',
      description: '📋 Post the live task board in this channel',
    },
    {
      name: 'addtask',
      description: '➕ Quickly add a new task',
      options: [
        { name: 'title', description: 'Task title', type: ApplicationCommandOptionType.String, required: true },
        { name: 'description', description: 'Task description', type: ApplicationCommandOptionType.String, required: false },
        { name: 'assignees', description: 'Mention users (e.g. @User1 @User2)', type: ApplicationCommandOptionType.String, required: false },
        { name: 'deadline', description: 'Deadline (YYYY-MM-DD or YYYY-MM-DD HH:MM)', type: ApplicationCommandOptionType.String, required: false },
        { name: 'reminder', description: 'Daily reminder until deadline?', type: ApplicationCommandOptionType.Boolean, required: false },
      ]
    },
    {
      name: 'settings',
      description: '⚙️ Configure timezone, working hours & reminders',
    }
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('✅ Slash commands deployed globally');
  } catch (error) {
    console.error('Failed to deploy commands:', error);
  }
}

module.exports = { deployCommands };
