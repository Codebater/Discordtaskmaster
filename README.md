# ✨ TaskBot for Discord

A simple but powerful task management bot with a live updating board, reminders, deadlines, and team member tagging — all controlled through Discord UI buttons.

---

## 🚀 Setup (5 minutes)

### 1. Create a Discord Application

1. Go to **https://discord.com/developers/applications**
2. Click **New Application** → name it "TaskBot"
3. Go to **Bot** tab → click **Add Bot**
4. Under **Token** → click **Reset Token** → copy the token
5. Under **Privileged Gateway Intents**, enable:
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### 2. Invite the Bot to Your Server

Go to **OAuth2 → URL Generator**:
- Scopes: `bot`, `applications.commands`
- Bot Permissions: `Send Messages`, `Embed Links`, `Read Message History`, `Use Slash Commands`, `Manage Messages`

Copy the generated URL and open it in your browser to invite the bot.

### 3. Install & Run

```bash
# Clone or download the bot files
cd discord-taskbot

# Install dependencies
npm install

# Copy and fill in your token
cp .env.example .env
# Edit .env and paste your DISCORD_TOKEN

# Start the bot
npm start
```

---

## 🎮 How to Use

### Commands

| Command | Description |
|---------|-------------|
| `/tasklist` | Posts the live task board in the current channel. Use this once to set up — the board updates automatically! |
| `/addtask` | Quickly add a task via command options |
| `/settings` | Open server-wide settings panel |

### The Task Board

After running `/tasklist`, a pinned message appears with buttons:

| Button | Action |
|--------|--------|
| ➕ Add Task | Opens a form to add a task with title, description, assignees, deadline, reminder |
| ✅ Complete | Pick a task to mark done |
| ✏️ Edit | Edit any existing task |
| 🗑️ Delete | Remove a task |
| ⚙️ Settings | Configure timezone & working hours |

### Settings Panel

| Setting | Description |
|---------|-------------|
| 🌍 Set Timezone | Server-wide timezone (e.g. `Europe/Berlin`) |
| 🕘 Work Hours | Reminder window (e.g. `09:00 – 17:00`) |
| 📅 Work Days | Which days to send reminders (0=Sun, 1=Mon, … 6=Sat) |
| 👤 My Timezone | Each member can set their own timezone for personal DM reminders |

### Reminders

- Set `reminder: yes` when adding a task
- Reminders are sent as **DMs** to assigned users
- Only sent during **working hours** in the member's timezone
- Escalate in urgency: 🔔 normal → ⚠️ 3 days left → 🚨 last day
- Stop automatically when the deadline passes or task is completed

---

## 📁 File Structure

```
discord-taskbot/
├── bot.js              # Main entry point
├── commands.js         # Slash command logic
├── buttonHandlers.js   # Button click handlers
├── modalHandlers.js    # Form submission handlers
├── selectHandlers.js   # Dropdown selection handlers
├── taskManager.js      # Data persistence (JSON files)
├── embedBuilder.js     # Discord embed builder
├── reminderService.js  # Background reminder scheduler
├── deploy-commands.js  # Registers slash commands with Discord
├── package.json
├── .env.example
└── data/               # Auto-created
    ├── tasks.json      # Task data
    └── settings.json   # Settings data
```

---

## 💡 Tips

- Pin the task board message so it's always visible
- Use `/tasklist` in a dedicated `#tasks` channel
- Members can set their own timezone with the **👤 My Timezone** button so reminders arrive at the right time for them
- Completed tasks are kept (last 5 shown) so the board shows progress

---

## 🔧 Extending

- **Persistent storage**: Replace `data/*.json` with a real database (SQLite, PostgreSQL) for large servers
- **Multiple boards**: Modify `taskManager.js` to support per-channel boards
- **Recurring tasks**: Add a `recurrence` field and handle in `reminderService.js`
