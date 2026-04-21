async function getRaidDelta(db, table, column, start, end) {
  const [rows] = await db.execute(
    `
    SELECT username,
           MIN(${column}) AS startValue,
           MAX(${column}) AS endValue
    FROM \`${table}\`
    WHERE time_inserted BETWEEN ? AND ?
    GROUP BY username
    `,
    [start, end]
  );

  return (rows || []).map(r => ({
    username: r.username,
    value: Math.max(0, (r.endValue || 0) - (r.startValue || 0))
  }));
}

module.exports = { getRaidDelta };