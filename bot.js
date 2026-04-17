require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { deployCommands } = require('./deploy-commands');
const taskManager = require('./taskManager');
const reminderService = require('./reminderService');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

client.commands = new Collection();

// Load command handlers
const commands = require('./commands');
for (const [name, command] of Object.entries(commands)) {
  client.commands.set(name, command);
}

client.once('ready', async () => {
  console.log(`✅ TaskBot is online as ${client.user.tag}`);
  await deployCommands(client);
  reminderService.start(client);
});

client.on('interactionCreate', async (interaction) => {
  try {
    // Block DM usage
    if (!interaction.guildId) {
      if (interaction.isRepliable()) {
        await interaction.reply({ content: '❌ This bot only works inside a server, not in DMs.', ephemeral: true });
      }
      return;
    }

    // Guild object is null when the bot was invited without the 'bot' scope.
    if (!interaction.guild) {
      if (interaction.isRepliable()) {
        await interaction.reply({
          content: '❌ Setup required: the bot must be re-invited with the **bot** scope and permissions. Ask a server admin to use the correct invite link.',
          ephemeral: true,
        });
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (command) await command.execute(interaction);
    } else if (interaction.isButton()) {
      await handleButton(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModal(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelect(interaction);
    }
  } catch (err) {
    console.error('[interaction error]', interaction.commandName || interaction.customId, err);
    const reply = { content: `❌ An error occurred: ${err.message}`, ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(reply).catch(() => {});
    } else {
      await interaction.reply(reply).catch(() => {});
    }
  }
});

async function handleButton(interaction) {
  const [action, ...params] = interaction.customId.split(':');
  const handlers = require('./buttonHandlers');
  if (handlers[action]) {
    await handlers[action](interaction, params);
  } else {
    await interaction.reply({ content: '❌ Unknown button action.', ephemeral: true });
  }
}

async function handleModal(interaction) {
  const [action, ...params] = interaction.customId.split(':');
  const handlers = require('./modalHandlers');
  if (handlers[action]) {
    await handlers[action](interaction, params);
  } else {
    await interaction.reply({ content: '❌ Unknown form submission.', ephemeral: true });
  }
}

async function handleSelect(interaction) {
  const [action, ...params] = interaction.customId.split(':');
  const handlers = require('./selectHandlers');
  if (handlers[action]) {
    await handlers[action](interaction, params);
  } else {
    await interaction.reply({ content: '❌ Unknown select action.', ephemeral: true });
  }
}

client.login(process.env.DISCORD_TOKEN);
