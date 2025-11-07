const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildLeaderboard } = require('../utils/leaderboard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Affiche le classement des meilleurs buzzers')
        .addIntegerOption(option =>
            option.setName('limit')
                .setDescription('Nombre de joueurs à afficher (1-25)')
                .setMinValue(1)
                .setMaxValue(25)
                .setRequired(false)
        ),
    
    async execute(interaction) {
        const limit = interaction.options.getInteger('limit') || 10;
        
        // Récupérer le leaderboard
        const leaderboard = getGuildLeaderboard(interaction.guildId, limit);
        
        if (leaderboard.length === 0) {
            return interaction.reply({
                content: '📊 Aucune statistique disponible pour le moment. Soyez le premier à buzzer!',
                ephemeral: true
            });
        }
        
        // Créer l'embed
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏆 Classement BUZZ')
            .setDescription('Les meilleurs buzzers du serveur!')
            .setTimestamp();
        
        // Ajouter les joueurs
        let description = '';
        const medals = ['🥇', '🥈', '🥉'];
        
        leaderboard.forEach((player, index) => {
            const medal = index < 3 ? medals[index] : `**${index + 1}.**`;
            const lastWin = player.lastWin 
                ? `\n   └ Dernière victoire: <t:${Math.floor(new Date(player.lastWin).getTime() / 1000)}:R>`
                : '';
            
            description += `${medal} **${player.username}**\n   └ ${player.wins} victoire${player.wins > 1 ? 's' : ''}${lastWin}\n\n`;
        });
        
        embed.setDescription(description);
        
        // Ajouter le footer avec le total de joueurs
        embed.setFooter({ 
            text: `Top ${leaderboard.length} sur ce serveur` 
        });
        
        await interaction.reply({ embeds: [embed] });
    },
};
