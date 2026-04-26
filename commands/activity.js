const { getDb, getAllUserTables } = require("../db/mysql");
const { parseDiscordTimestamp } = require("../utils/time");
const { sendPaginatedEmbed } = require("../utils/pagination");

const categoryPriority = {
  "Whitelisted": 6,
  "Absent": 4,
  "New member": 3,
  "Active": 5,
  "Warn": 2,
  "Unknown": 0,
  "Inactive": 1,
  "Kick": 1
};

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

  const startInput = interaction.options.getString("start");
  const endInput = interaction.options.getString("end");

  const now = new Date();

  const start = startInput
    ? parseDiscordTimestamp(startInput)
    : new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 1 week ago

  const end = endInput
    ? parseDiscordTimestamp(endInput)
    : now;

  if (!start || !end) {
    throw new Error("Invalid start or end timestamp");
  }

  const [[timeReqRow]] = await db.execute(
    `SELECT value FROM setting_bot_values WHERE name = 'time_req' LIMIT 1`
  );
  const requiredHours = parseTimeToHours(timeReqRow?.value || "0h 0m");

  const [[timeKickRow]] = await db.execute(
    `SELECT value FROM setting_bot_values WHERE name = 'kick_req' LIMIT 1`
  );
  const kickHours = parseTimeToHours(timeKickRow?.value || "0h 0m");

  let results = [];
  let noAccess = [];

  for (const table of tables) {
    const [rows] = await db.execute(
      `
      SELECT 
        MIN(playtime) AS startValue,
        MAX(playtime) AS endValue,
        (
          SELECT username 
          FROM \`${table}\`
          WHERE time_inserted <= ?
          ORDER BY time_inserted DESC
          LIMIT 1
        ) AS lastUsername
      FROM \`${table}\`
      WHERE time_inserted BETWEEN ? AND ?
         OR time_inserted = (
           SELECT MAX(time_inserted)
           FROM \`${table}\`
           WHERE time_inserted < ?
         )
      `,
      [end, start, end, start]
    );

    const r = rows?.[0];
    if (!r) continue;

    const startVal = r.startValue || 0;
    const endVal = r.endValue || 0;
    const username = r.lastUsername || table;

    if (endVal === 0 || startVal === 0) {
      noAccess.push({
        username,
        value: 0,
        noAccess: true,
        category: "Unknown"
      });
      continue;
    }

    const value = Math.max(0, endVal - startVal);

    const [[info]] = await db.execute(
      `
      SELECT immune, absent_until, absent_from
      FROM setting_additional_info
      WHERE username = ? LIMIT 1
      `,
      [username]
    );

    let category = "Active";

    const absentFrom = info?.absent_from ? new Date(info.absent_from) : null;
    const absentUntil = info?.absent_until ? new Date(info.absent_until) : null;

    if (info?.immune) {
      category = "Whitelisted";
    } else if (
      absentFrom &&
      absentUntil &&
      absentUntil >= start &&
      absentFrom <= end
    ) {
      category = "Absent";
    } else {
      const [[beforeStart]] = await db.execute(
        `
        SELECT 1
        FROM \`${table}\`
        WHERE time_inserted < ?
        LIMIT 1
        `,
        [start]
      );

      const isNewMember = !beforeStart;

      if (isNewMember) {
        category = "New member";
      } else if (value < kickHours) {
        category = kickHours === requiredHours ? "Inactive" : "Kick";
      } else if (value < requiredHours) {
        category = "Warn";
      }
    }

    results.push({
      username,
      value,
      noAccess: false,
      category
    });
  }

  results.sort((a, b) => {
    if (a.value !== b.value) {
      return a.value - b.value;
    }

    return (categoryPriority[a.category] ?? 99) -
           (categoryPriority[b.category] ?? 99);
  });

  const finalResults = [...noAccess, ...results];

  return sendPaginatedEmbed(
    interaction,
    finalResults,
    formatLine,
    "Playtime"
  );
}

module.exports = { getActivity };