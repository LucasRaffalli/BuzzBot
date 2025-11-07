const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Affiche les informations sur le bot'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📊 Informations du Bot')
            .setDescription('BuzzBot - Un bot Discord modulaire et performant')
            .addFields(
                { name: '👥 Serveurs', value: `${interaction.client.guilds.cache.size}`, inline: true },
                { name: '👤 Utilisateurs', value: `${interaction.client.users.cache.size}`, inline: true },
                { name: '📝 Commandes', value: `${interaction.client.commands.size}`, inline: true },
                { name: '⏱️ Uptime', value: `${Math.floor(process.uptime() / 60)} minutes`, inline: true },
                { name: '💾 Mémoire', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
                { name: '🌐 Ping', value: `${interaction.client.ws.ping}ms`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: `Demandé par ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() });
        
        await interaction.reply({ embeds: [embed] });
    },
};
