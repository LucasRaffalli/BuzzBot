const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { removePoints, getUserStats } = require('../utils/leaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removepoints')
        .setDescription('➖ Retire des points à un utilisateur')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addUserOption(option =>
            option.setName('utilisateur')
                .setDescription('L\'utilisateur à qui retirer des points')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('points')
                .setDescription('Nombre de points à retirer')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),
    
    async execute(interaction) {
        const user = interaction.options.getUser('utilisateur');
        const pointsToRemove = interaction.options.getInteger('points');

        // Vérifier les stats actuelles
        const currentStats = getUserStats(interaction.guildId, user.id);
        
        if (!currentStats) {
            return interaction.reply({
                content: `❌ ${user} n'a pas encore de points dans le leaderboard!`,
                ephemeral: true
            });
        }

        // Retirer les points
        const result = removePoints(interaction.guildId, user.id, pointsToRemove);

        if (!result.success) {
            return interaction.reply({
                content: `❌ ${result.message}`,
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('➖ Points retirés')
            .setDescription(
                `**${user}** a perdu **-${pointsToRemove}** point${pointsToRemove > 1 ? 's' : ''}!\n\n` +
                `📊 Ancien total: **${currentStats.wins}** point${currentStats.wins > 1 ? 's' : ''}\n` +
                `📊 Nouveau total: **${result.newTotal}** point${result.newTotal > 1 ? 's' : ''}`
            )
            .setTimestamp()
            .setFooter({ text: `Retiré par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });

        await interaction.reply({ embeds: [embed] });
        
        console.log(`➖ ${interaction.user.tag} a retiré ${pointsToRemove} point(s) à ${user.tag} (Nouveau total: ${result.newTotal})`);
    },
};
