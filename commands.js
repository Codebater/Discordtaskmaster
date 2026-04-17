const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
        EmbedBuilder, ButtonBuilder, ButtonStyle, ChannelType } = require('discord.js');
const taskManager = require('./taskManager');
const { buildTaskListEmbed, buildDoneEmbed } = require('./embedBuilder');

const commands = {
  // /tasklist — posts or refreshes the persistent task board + done board
  tasklist: {
    data: {
      name: 'tasklist',
      description: '📋 Post the live task board + done board in this channel',
    },
    async execute(interaction) {
      await interaction.deferReply();
      const guildId = interaction.guild.id;
      const guildData = taskManager.getGuildTasks(guildId);
      const settings = taskManager.getGuildSettings(guildId);

      // Delete old main board
      if (guildData.listMessageId && guildData.listChannelId) {
        try {
          const oldCh = await interaction.guild.channels.fetch(guildData.listChannelId);
          const oldMsg = await oldCh.messages.fetch(guildData.listMessageId);
          await oldMsg.delete();
        } catch {}
      }

      // Delete old done board
      if (guildData.doneMessageId && guildData.doneChannelId) {
        try {
          const oldCh = await interaction.guild.channels.fetch(guildData.doneChannelId);
          const oldMsg = await oldCh.messages.fetch(guildData.doneMessageId);
          await oldMsg.delete();
        } catch {}
      }

      // Post done board first (so main board appears below it, i.e. more recent)
      const doneEmbed = buildDoneEmbed(guildData.tasks || [], settings);
      const doneMsg = await interaction.channel.send({ embeds: [doneEmbed] });
      taskManager.setDoneMessage(guildId, doneMsg.id, interaction.channel.id);

      // Post main board
      const { embeds, components } = buildTaskListEmbed(guildData, settings);
      const msg = await interaction.editReply({ embeds, components });
      taskManager.setListMessage(guildId, msg.id, interaction.channel.id);
    }
  },

  // /addtask — quick add without UI
  addtask: {
    data: {
      name: 'addtask',
      description: '➕ Quickly add a task',
      options: [
        { name: 'title', description: 'Task title', type: 3, required: true },
        { name: 'description', description: 'Task description', type: 3, required: false },
        { name: 'assignees', description: 'Mention users (e.g. @User1 @User2)', type: 3, required: false },
        { name: 'deadline', description: 'Deadline (YYYY-MM-DD or YYYY-MM-DD HH:MM)', type: 3, required: false },
        { name: 'reminder', description: 'Daily reminder until deadline?', type: 5, required: false },
      ]
    },
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const title = interaction.options.getString('title');
      const description = interaction.options.getString('description') || '';
      const assigneeStr = interaction.options.getString('assignees') || '';
      const deadlineStr = interaction.options.getString('deadline') || '';
      const reminder = interaction.options.getBoolean('reminder') || false;

      const assignees = [...assigneeStr.matchAll(/<@!?(\d+)>/g)].map(m => m[1]);
      let deadline = null;
      if (deadlineStr) {
        const d = new Date(deadlineStr);
        if (!isNaN(d)) deadline = d.toISOString();
      }

      const guildId = interaction.guild.id;
      taskManager.addTask(guildId, { title, description, assignees, deadline, reminder });
      await updateListMessage(interaction.guild);

      await interaction.editReply({ content: `✅ Task **"${title}"** added!` });
    }
  },

  // /setup — creates #tasks channel and posts live boards
  setup: {
    data: {
      name: 'setup',
      description: '🔧 Create the #tasks channel and post the live task boards',
    },
    async execute(interaction) {
      await interaction.deferReply({ ephemeral: true });
      const guildId = interaction.guild.id;
      const guildData = taskManager.getGuildTasks(guildId);
      const settings = taskManager.getGuildSettings(guildId);

      // Fetch fresh channel list from API (cache may be empty on cold start)
      const allChannels = await interaction.guild.channels.fetch();
      let tasksChannel = allChannels.find(ch => ch && ch.name === 'tasks' && ch.isTextBased());
      if (!tasksChannel) {
        tasksChannel = await interaction.guild.channels.create({
          name: 'tasks',
          type: ChannelType.GuildText,
          topic: '📋 Live task board — managed by TaskBot',
        });
      }

      // Delete old boards if they exist
      if (guildData.listMessageId && guildData.listChannelId) {
        try {
          const oldCh = await interaction.guild.channels.fetch(guildData.listChannelId);
          const oldMsg = await oldCh.messages.fetch(guildData.listMessageId);
          await oldMsg.delete();
        } catch {}
      }
      if (guildData.doneMessageId && guildData.doneChannelId) {
        try {
          const oldCh = await interaction.guild.channels.fetch(guildData.doneChannelId);
          const oldMsg = await oldCh.messages.fetch(guildData.doneMessageId);
          await oldMsg.delete();
        } catch {}
      }

      // Post done board, then main board
      const doneEmbed = buildDoneEmbed(guildData.tasks || [], settings);
      const doneMsg = await tasksChannel.send({ embeds: [doneEmbed] });
      await doneMsg.pin().catch(() => {});
      taskManager.setDoneMessage(guildId, doneMsg.id, tasksChannel.id);

      const { embeds, components } = buildTaskListEmbed(guildData, settings);
      const mainMsg = await tasksChannel.send({ embeds, components });
      await mainMsg.pin().catch(() => {});
      taskManager.setListMessage(guildId, mainMsg.id, tasksChannel.id);

      await interaction.editReply({
        content: `✅ TaskBot is set up in ${tasksChannel}! The task boards are live and pinned.`,
      });
    }
  },

  // /settings
  settings: {
    data: {
      name: 'settings',
      description: '⚙️ Configure timezone, working hours & display options',
    },
    async execute(interaction) {
      await showSettingsPanel(interaction);
    }
  }
};

async function showSettingsPanel(interaction) {
  const guildId = interaction.guild.id;
  const s = taskManager.getGuildSettings(guildId);
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const workDaysStr = (s.workDays || [1,2,3,4,5]).map(d => dayNames[d]).join(', ');

  const embed = new EmbedBuilder()
    .setTitle('⚙️ TaskBot Settings')
    .setColor(0xEB459E)
    .addFields(
      { name: '🌍 Timezone',         value: s.timezone,                                   inline: true },
      { name: '🕘 Work Hours',        value: `${s.workStart} – ${s.workEnd}`,              inline: true },
      { name: '📅 Work Days',         value: workDaysStr,                                  inline: true },
      { name: '📊 Progress Bar',      value: `${s.barLength ?? 16} blocks`,                inline: true },
      { name: '✅ Done preview',      value: `${s.donePreviewCount ?? 3} on main board`,   inline: true },
      { name: '📋 Done board size',   value: `${s.doneListShowCount ?? 10} tasks`,         inline: true },
    )
    .setFooter({ text: 'Reminders only fire during working hours · members can set personal timezone' });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('settings:timezone').setLabel('🌍 Timezone').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('settings:hours').setLabel('🕘 Work Hours').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('settings:days').setLabel('📅 Work Days').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('settings:display').setLabel('📊 Display').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('settings:mytz').setLabel('👤 My Timezone').setStyle(ButtonStyle.Secondary),
  );

  const opts = { embeds: [embed], components: [row1], ephemeral: true };
  if (interaction.replied || interaction.deferred) {
    await interaction.editReply(opts);
  } else {
    await interaction.reply(opts);
  }
}

async function updateListMessage(guild) {
  const guildId = guild.id;
  const guildData = taskManager.getGuildTasks(guildId);
  const settings = taskManager.getGuildSettings(guildId);

  // Update main board
  if (guildData.listMessageId && guildData.listChannelId) {
    try {
      const channel = await guild.channels.fetch(guildData.listChannelId);
      const msg = await channel.messages.fetch(guildData.listMessageId);
      const { embeds, components } = buildTaskListEmbed(guildData, settings);
      await msg.edit({ embeds, components });
    } catch (e) {
      console.error('Could not update main board:', e.message);
    }
  }

  // Update done board
  if (guildData.doneMessageId && guildData.doneChannelId) {
    try {
      const channel = await guild.channels.fetch(guildData.doneChannelId);
      const msg = await channel.messages.fetch(guildData.doneMessageId);
      const doneEmbed = buildDoneEmbed(guildData.tasks || [], settings);
      await msg.edit({ embeds: [doneEmbed] });
    } catch (e) {
      console.error('Could not update done board:', e.message);
    }
  }
}

module.exports = commands;
module.exports.showSettingsPanel = showSettingsPanel;
module.exports.updateListMessage = updateListMessage;

