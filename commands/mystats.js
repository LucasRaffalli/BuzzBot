const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserStats, getRemainingAttacks } = require('../utils/leaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mystats')
        .setDescription('Affiche vos statistiques BUZZ personnelles'),
    
    async execute(interaction) {
        // Récupérer les stats de l'utilisateur
        const stats = getUserStats(interaction.guildId, interaction.user.id);
        const remainingAttacks = getRemainingAttacks(interaction.guildId, interaction.user.id);
        
        if (!stats) {
            return interaction.reply({
                content: '📊 Vous n\'avez pas encore de statistiques. Participez à un événement et soyez le premier à buzzer!',
                ephemeral: true
            });
        }
        
        // Créer l'embed
        const embed = new EmbedBuilder()
            .setColor('#00D9FF')
            .setTitle(`📊 Statistiques de ${interaction.user.username}`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '🏆 Victoires totales', value: `${stats.wins}`, inline: true },
                { name: '📍 Classement', value: `#${stats.rank} sur ${stats.totalPlayers}`, inline: true },
                { name: '⚔️ Attaques restantes', value: `${remainingAttacks}/3`, inline: true },
                { name: '📈 Taux de réussite', value: `${((stats.rank / stats.totalPlayers) * 100).toFixed(1)}% top`, inline: true }
            )
            .setTimestamp();
        
        // Ajouter la dernière victoire si elle existe
        if (stats.lastWin) {
            const lastWinTimestamp = Math.floor(new Date(stats.lastWin).getTime() / 1000);
            embed.addFields({
                name: '⏰ Dernière victoire',
                value: `<t:${lastWinTimestamp}:R>`,
                inline: false
            });
        }
        
        // Ajouter un message motivant selon le rang
        let motivation = '';
        if (stats.rank === 1) {
            motivation = '👑 Vous êtes le champion! Continuez comme ça!';
        } else if (stats.rank <= 3) {
            motivation = '🔥 Sur le podium! Encore un effort pour la première place!';
        } else if (stats.rank <= 10) {
            motivation = '💪 Dans le top 10! Vous êtes sur la bonne voie!';
        } else {
            motivation = '🚀 Continuez à buzzer pour grimper dans le classement!';
        }
        
        embed.setFooter({ text: motivation });
        
        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
