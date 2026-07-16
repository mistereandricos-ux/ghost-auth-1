require('dotenv').config();

const {
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder,
  ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle,
} = require('discord.js');

const db = require('./db');

const OWNER_USERNAME = 'ninoxx311';
const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) { console.error('DISCORD_TOKEN manquant'); process.exit(1); }

function generateKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < 25; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return `ghst-${s}`;
}

function buildPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🎮  Panel d\'accès Ghost')
    .setDescription(
      '> Gérez votre accès depuis les boutons ci-dessous.\n\n' +
      '**🔑 Redeem Key** — Activer votre clé d\'accès\n' +
      '**🔄 Reset HWID** — Réinitialiser votre identifiant matériel\n' +
      '**📜 Get Script** — Recevoir le loader Lua en privé'
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Ghost Panel' })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('redeem_key').setLabel('Redeem Key').setEmoji('🔑').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('reset_hwid').setLabel('Reset HWID').setEmoji('🔄').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('get_script').setLabel('Get Script').setEmoji('📜').setStyle(ButtonStyle.Success),
  );
  return { embeds: [embed], components: [row] };
}

function buildLuaLoader(key) {
  return `script_key="${key}";\nloadstring(game:HttpGet("your repo"))()`;
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.once('ready', () => console.log(`✅ Bot connecté : ${client.user.tag}`));

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'genkey') {
        if (interaction.user.username !== OWNER_USERNAME)
          return interaction.reply({ content: '❌ Permission refusée.', ephemeral: true });
        const target = interaction.options.getUser('user');
        const key = generateKey();
        db.upsertKey(target.id, key);
        try {
          await target.send({ embeds: [new EmbedBuilder()
            .setTitle('🔑  Voici ta clé d\'accès')
            .setDescription(`\`\`\`\n${key}\n\`\`\``)
            .setColor(0x57f287)
            .setFooter({ text: 'Ne partage jamais ta clé.' })
            .setTimestamp()] });
          return interaction.reply({ content: `✅ Clé envoyée en DM à ${target}.`, ephemeral: true });
        } catch {
          return interaction.reply({ content: `✅ Clé générée (DMs fermés) : \`${key}\``, ephemeral: true });
        }
      }
      if (interaction.commandName === 'panel') return interaction.reply(buildPanel());
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'redeem_key') {
        const modal = new ModalBuilder().setCustomId('modal_redeem').setTitle('Redeem Key');
        modal.addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('key_input').setLabel('Entre ta clé d\'accès')
            .setPlaceholder('ghst-XXXXXXXXXXXXXXXXXXXXXXXXX')
            .setStyle(TextInputStyle.Short).setMinLength(30).setMaxLength(30).setRequired(true)
        ));
        return interaction.showModal(modal);
      }
      if (interaction.customId === 'reset_hwid') {
        if (!db.getUser(interaction.user.id))
          return interaction.reply({ content: '❌ Aucune clé associée à ton compte.', ephemeral: true });
        db.resetHwid(interaction.user.id);
        return interaction.reply({ content: '✅ HWID réinitialisé avec succès !', ephemeral: true });
      }
      if (interaction.customId === 'get_script') {
        const user = db.getUser(interaction.user.id);
        if (!user)
          return interaction.reply({ content: '❌ Aucune clé. Utilise **Redeem Key** d\'abord.', ephemeral: true });
        try {
          await interaction.user.send(`Here is your script:\n\`\`\`\n${buildLuaLoader(user.key)}\n\`\`\``);
          return interaction.reply({ content: '✅ Script envoyé en DM !', ephemeral: true });
        } catch {
          return interaction.reply({ content: '❌ DMs fermés. Active tes DMs Discord.', ephemeral: true });
        }
      }
    }

    if (interaction.isModalSubmit() && interaction.customId === 'modal_redeem') {
      const keyInput = interaction.fields.getTextInputValue('key_input').trim();
      if (!keyInput.startsWith('ghst-') || keyInput.length !== 30)
        return interaction.reply({ content: '❌ Format invalide. (ex: ghst-XXXXXXXXXXXXXXXXXXXXXXXXX)', ephemeral: true });
      const entry = db.findByKey(keyInput);
      if (!entry)
        return interaction.reply({ content: '❌ Clé introuvable.', ephemeral: true });
      if (entry.userId !== interaction.user.id)
        return interaction.reply({ content: '❌ Cette clé appartient à quelqu\'un d\'autre.', ephemeral: true });
      return interaction.reply({ content: '✅ Clé activée sur ton compte !', ephemeral: true });
    }

  } catch (err) {
    console.error(err);
    const p = { content: '❌ Erreur interne.', ephemeral: true };
    interaction.replied || interaction.deferred ? interaction.followUp(p).catch(() => {}) : interaction.reply(p).catch(() => {});
  }
});

client.login(TOKEN);
