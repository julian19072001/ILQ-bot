const { getDb, getAllUserTables } = require("../db/mysql");
const { parseDiscordTimestamp } = require("../utils/time");
const { sendPaginatedEmbed } = require("../utils/pagination");

function parseTimeToHours(str) {
  const h = str.match(/(\d+)h/)?.[1] || 0;
  const m = str.match(/(\d+)m/)?.[1] || 0;
  return Number(h) + Number(m) / 60;
}

function formatLine(u) {
  const name = u.username.slice(0, 18).padEnd(18);
  const category = (u.category || "Unknown").padEnd(12);

  if (u.noAccess) {
    return `${name} | ${category} | No API access`;
  }

  const hrs = Math.floor(u.value);
  const mins = Math.round((u.value - hrs) * 60);

  return `${name} | ${category} | ${`${hrs}h ${mins}m`.padStart(10)}`;
}

async function getActivity(interaction) {
  const db = await getDb();
  const tables = await getAllUserTables(db);

  const start = parseDiscordTimestamp(interaction.options.getString("start"));
  const endInput = interaction.options.getString("end");
  const end = endInput === "now" ? new Date() : parseDiscordTimestamp(endInput);

  const [[timeReqRow]] = await db.execute(
    `SELECT value FROM setting_bot_values WHERE name = 'time_req' LIMIT 1`
  );

  const requiredHours = parseTimeToHours(timeReqRow?.value || "0h 0m");

  let results = [];
  let noAccess = [];

  for (const table of tables) {
    const [rows] = await db.execute(
      `
      SELECT username,
             MIN(playtime) AS startValue,
             MAX(playtime) AS endValue
      FROM \`${table}\`
      WHERE time_inserted BETWEEN ? AND ?
         OR time_inserted = (
           SELECT MAX(time_inserted)
           FROM \`${table}\` t2
           WHERE t2.username = \`${table}\`.username
           AND t2.time_inserted < ?
         )
      GROUP BY username
      `,
      [start, end, start]
    );

    for (const r of rows || []) {
      const startVal = r.startValue || 0;
      const endVal = r.endValue || 0;

      const [[info]] = await db.execute(
        `
        SELECT immune, absent_until
        FROM setting_additional_info
        WHERE username = ? LIMIT 1
        `,
        [r.username]
      );

      let category = "Active";

      if (info?.immune) {
        category = "Immune";
      }

      else if (
        info?.absent_from &&
        info?.absent_until &&
        end >= new Date(info.absent_from) &&
        start <= new Date(info.absent_until)
      ) {
        category = "Absent";
      }

      if (endVal === 0) {
        noAccess.push({
          username: r.username,
          value: 0,
          noAccess: true,
          category: "Unknown"
        });
        continue;
      }

      const value = Math.max(0, endVal - startVal);

      const [[beforeStart]] = await db.execute(
        `
        SELECT 1
        FROM \`${table}\`
        WHERE username = ?
          AND time_inserted < ?
        LIMIT 1
        `,
        [r.username, start]
      );

      const isNewMember = !beforeStart;

      if (isNewMember) {
        category = "New member";
      }

      else if (value < requiredHours) {
        category = "Inactive";
      }

      results.push({
        username: r.username,
        value,
        noAccess: false,
        category
      });
    }
  }

  results.sort((a, b) => a.value - b.value);

  const finalResults = [...noAccess, ...results];

  return sendPaginatedEmbed(
    interaction,
    finalResults,
    formatLine,
    "Playtime"
  );
}

module.exports = { getActivity };