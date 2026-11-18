// Fetches the last year of GitHub contributions into data/contributions.json.
// Needs GH_TOKEN (any token works; a personal token also counts private contributions).
import { writeFileSync } from 'node:fs';

const login = process.env.GH_LOGIN || 'ayhangad';
const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{
  totalContributions weeks{contributionDays{date contributionCount contributionLevel}}}}}}`;

const res = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { Authorization: `bearer ${process.env.GH_TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query, variables: { login } }),
});
const json = await res.json();
if (!res.ok || json.errors) { console.error(JSON.stringify(json)); process.exit(1); }
writeFileSync(new URL('../data/contributions.json', import.meta.url), JSON.stringify(json));
console.log('contributions:', json.data.user.contributionsCollection.contributionCalendar.totalContributions);
