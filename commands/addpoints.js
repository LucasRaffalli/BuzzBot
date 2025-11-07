const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { addWin } = require('../utils/leaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addpoints')
        .setDescription('➕ Ajoute des points à un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à qui ajouter des points')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('points')
                .setDescription('Nombre de points à ajouter')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
    
    async execute(interaction) {
        const user = interaction.options.getUser('utilisateur');
        const pointsToAdd = interaction.options.getInteger('points');

        // Ajouter les points
        for (let i = 0; i < pointsToAdd; i++) {
            addWin(interaction.guildId, user.id, user.tag);
        }

        // Obtenir le nouveau total
        const { getUserStats } = require('../utils/leaderboard');
        const stats = getUserStats(interaction.guildId, user.id);
        const newTotal = stats ? stats.wins : pointsToAdd;

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('➕ Points ajoutés')
            .setDescription(
                `**${user}** a reçu **+${pointsToAdd}** point${pointsToAdd > 1 ? 's' : ''}!\n\n` +
                `📊 Nouveau total: **${newTotal}** point${newTotal > 1 ? 's' : ''}`
            )
            .setTimestamp()
            .setFooter({ text: `Ajouté par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
        
        console.log(`➕ ${interaction.user.tag} a ajouté ${pointsToAdd} point(s) à ${user.tag} (Total: ${newTotal})`);
    },
};
