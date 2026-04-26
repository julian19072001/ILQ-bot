const { getDb } = require("../db/mysql");

function parseTimeInput(time) {
  const match = time.match(/^\s*(\d+)\s*h\s*(\d+)\s*m\s*$/i);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (minutes >= 60) return null;

  return `${hours}h ${minutes}m`;
}

async function updateWarnReq(interaction) {
  const db = await getDb();

  const time = interaction.options.getString("time");
  const formattedTime = parseTimeInput(time);

  if (!formattedTime) {
    return interaction.reply({
      content: "Invalid time format. Use like '2h 30m'.",
      flags: 64
    });
  }

  await db.execute(
    `UPDATE setting_bot_values
     SET value = ?
     WHERE name = 'time_req'`,
    [formattedTime]
  );

  return interaction.reply({content: `Update the warn time limit to **${formattedTime}**`});
}

async function updateKickReq(interaction) {
  const db = await getDb();

  const time = interaction.options.getString("time");
  const formattedTime = parseTimeInput(time);

  if (!formattedTime) {
    return interaction.reply({
      content: "Invalid time format. Use like '2h 30m'.",
      flags: 64
    });
  }

  await db.execute(
    `UPDATE setting_bot_values
     SET value = ?
     WHERE name = 'kick_req'`,
    [formattedTime]
  );

  return interaction.reply({content: `Update the kick time limit to **${formattedTime}**`});
}

module.exports = { updateWarnReq, updateKickReq };