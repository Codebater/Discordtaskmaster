const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');
const SETTINGS_FILE = path.join(__dirname, 'data', 'settings.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

function loadTasks() {
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch { return {}; }
}

function saveTasks(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { return {}; }
}

function saveSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

function getGuildTasks(guildId) {
  const all = loadTasks();
  return all[guildId] || {
    tasks: [],
    listMessageId: null,
    listChannelId: null,
    doneMessageId: null,
    doneChannelId: null,
  };
}

function saveGuildTasks(guildId, guildData) {
  const all = loadTasks();
  all[guildId] = guildData;
  saveTasks(all);
}

function addTask(guildId, task) {
  const guild = getGuildTasks(guildId);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const newTask = { id, ...task, done: false, createdAt: new Date().toISOString() };
  guild.tasks.push(newTask);
  saveGuildTasks(guildId, guild);
  return newTask;
}

function getTask(guildId, taskId) {
  const guild = getGuildTasks(guildId);
  return guild.tasks.find(t => t.id === taskId);
}

function updateTask(guildId, taskId, updates) {
  const guild = getGuildTasks(guildId);
  const idx = guild.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return null;
  guild.tasks[idx] = { ...guild.tasks[idx], ...updates };
  saveGuildTasks(guildId, guild);
  return guild.tasks[idx];
}

function deleteTask(guildId, taskId) {
  const guild = getGuildTasks(guildId);
  guild.tasks = guild.tasks.filter(t => t.id !== taskId);
  saveGuildTasks(guildId, guild);
}

function setListMessage(guildId, messageId, channelId) {
  const guild = getGuildTasks(guildId);
  guild.listMessageId = messageId;
  guild.listChannelId = channelId;
  saveGuildTasks(guildId, guild);
}

function setDoneMessage(guildId, messageId, channelId) {
  const guild = getGuildTasks(guildId);
  guild.doneMessageId = messageId;
  guild.doneChannelId = channelId;
  saveGuildTasks(guildId, guild);
}

function getAllTasksWithDeadlines() {
  const all = loadTasks();
  const results = [];
  for (const [guildId, guildData] of Object.entries(all)) {
    for (const task of (guildData.tasks || [])) {
      if (!task.done && task.deadline && (task.assignees?.length || task.reminder)) {
        results.push({ guildId, task });
      }
    }
  }
  return results;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

function getGuildSettings(guildId) {
  const all = loadSettings();
  return all[guildId] || {
    timezone: 'UTC',
    workStart: '09:00',
    workEnd: '17:00',
    workDays: [1, 2, 3, 4, 5], // Mon-Fri
    doneListShowCount: 10,      // how many completed tasks to show in done board
    donePreviewCount: 3,        // how many to preview on main board
    barLength: 16,              // progress bar length in blocks
  };
}

function saveGuildSettings(guildId, settings) {
  const all = loadSettings();
  all[guildId] = { ...getGuildSettings(guildId), ...settings };
  saveSettings(all);
}

function getMemberSettings(guildId, userId) {
  const all = loadSettings();
  const key = `${guildId}_${userId}`;
  return all[key] || null;
}

function saveMemberSettings(guildId, userId, settings) {
  const all = loadSettings();
  const key = `${guildId}_${userId}`;
  all[key] = { ...( all[key] || {}), ...settings };
  saveSettings(all);
}

module.exports = {
  getGuildTasks, saveGuildTasks, addTask, getTask, updateTask, deleteTask,
  setListMessage, setDoneMessage, getAllTasksWithDeadlines,
  getGuildSettings, saveGuildSettings, getMemberSettings, saveMemberSettings,
};
