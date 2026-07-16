require('dotenv').config();
const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
  new SlashCommandBuilder()
    .setName('genkey')
    .setDescription('Génère une clé (owner uniquement)')
    .addUserOption(o => o.setName('user').setDescription('Utilisateur').setRequired(true)),
  new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Affiche le panel Ghost'),
].map(c => c.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
  console.log('✅ Commandes enregistrées !');
})();
