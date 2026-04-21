function parseDiscordTimestamp(input) {
  const match = input.match(/<t:(\d+):[a-zA-Z]?>/);
  return match ? new Date(Number(match[1]) * 1000) : null;
}

module.exports = { parseDiscordTimestamp };