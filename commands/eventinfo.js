const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eventinfo')
        .setDescription('Affiche les informations de l\'événement en cours'),
    
    async execute(interaction) {
        // Récupérer l'état du BUZZ
        const buzzState = interaction.client.buzzState.get(interaction.guildId);
        
        if (!buzzState) {
            return interaction.reply({
                content: '❌ Aucun événement en cours!',
                ephemeral: true
            });
        }

        // Calculer la durée de l'événement
        const duration = Date.now() - buzzState.createdAt;
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);

        // Récupérer le créateur de l'événement
        const creator = await interaction.guild.members.fetch(buzzState.createdBy).catch(() => null);

        // Récupérer le canal vocal
        const voiceChannel = interaction.guild.channels.cache.get(buzzState.voiceChannelId);
        const textChannel = interaction.guild.channels.cache.get(buzzState.channelId);

        // Compter les participants
        const participants = voiceChannel ? voiceChannel.members.filter(m => !m.user.bot).size : 0;

        // État actuel
        let currentState = '';
        if (buzzState.attackData) {
            currentState = `⚔️ **Attaque en cours:** <@${buzzState.attackData.attacker.userId}> → <@${buzzState.attackData.target.userId}>`;
        } else if (buzzState.voteData) {
            currentState = `🗳️ **Vote MultiBuzz en cours** (${Object.keys(buzzState.voteData.votes).length} votes)`;
        } else if (buzzState.multiBuzzers && buzzState.multiBuzzers.length > 0) {
            currentState = `🎪 **MultiBuzz:** ${buzzState.multiBuzzers.length}/3 participants`;
        } else if (buzzState.currentSpeaker) {
            currentState = `🔊 **En cours:** <@${buzzState.currentSpeaker}> parle`;
        } else if (buzzState.canBuzz) {
            currentState = `✅ **En attente** - Prêt pour un nouveau BUZZ`;
        } else {
            currentState = `⏸️ **Pause**`;
        }

        const embed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📊 Informations de l\'événement')
            .setDescription(
                `**ID:** \`${buzzState.eventId}\`\n` +
                `**Mode:** ${buzzState.mode === 'multi' ? '🎪 MultiBuzz (3 joueurs + vote)' : '🎯 SimpleBuzz (1 joueur)'}\n\n` +
                currentState
            )
            .addFields(
                { name: '🎤 Canal Vocal', value: voiceChannel ? voiceChannel.name : 'Inconnu', inline: true },
                { name: '💬 Canal Texte', value: textChannel ? textChannel.name : 'Inconnu', inline: true },
                { name: '👥 Participants', value: `${participants}`, inline: true },
                { name: '⏱️ Durée', value: `${minutes}m ${seconds}s`, inline: true },
                { name: '👤 Créé par', value: creator ? creator.user.tag : 'Inconnu', inline: true },
                { name: '🔔 BUZZ disponible', value: buzzState.canBuzz ? '✅ Oui' : '❌ Non', inline: true }
            )
            .setTimestamp(buzzState.createdAt)
            .setFooter({ text: 'Événement démarré' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
