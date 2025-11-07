const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const { saveEvent } = require('../utils/eventStorage');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('startevent')
        .setDescription('Démarre un événement et rejoint votre canal vocal')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Mode de jeu')
                .setRequired(true)
                .addChoices(
                    { name: '🎯 SimpleBuzz - 1 personne à la fois', value: 'simple' },
                    { name: '🎪 MultiBuzz - 3 personnes + vote', value: 'multi' }
                )
        ),
    
    async execute(interaction) {
        // Vérifier si l'utilisateur est dans un canal vocal
        if (!interaction.member.voice.channel) {
            return interaction.reply({
                content: '❌ Vous devez être dans un canal vocal pour démarrer un événement!',
                ephemeral: true
            });
        }

        const voiceChannel = interaction.member.voice.channel;

        // Vérifier les permissions du bot
        const permissions = voiceChannel.permissionsFor(interaction.client.user);
        if (!permissions.has(PermissionFlagsBits.Connect) || !permissions.has(PermissionFlagsBits.Speak) || !permissions.has(PermissionFlagsBits.MuteMembers)) {
            return interaction.reply({
                content: '❌ Je n\'ai pas les permissions nécessaires (Rejoindre, Parler, Mute les membres) dans ce canal vocal!',
                ephemeral: true
            });
        }

        try {
            // Vérifier si le bot est déjà connecté
            let connection = getVoiceConnection(interaction.guildId);
            
            if (connection) {
                return interaction.reply({
                    content: '⚠️ Je suis déjà dans un canal vocal! Utilisez `/stopevent` pour me déconnecter d\'abord.',
                    ephemeral: true
                });
            }

            // Rejoindre le canal vocal
            connection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: interaction.guildId,
                adapterCreator: interaction.guild.voiceAdapterCreator,
            });

            // Muter tous les membres du canal vocal
            const members = voiceChannel.members.filter(member => !member.user.bot);
            let mutedCount = 0;
            
            for (const [, member] of members) {
                try {
                    await member.voice.setMute(true, 'Événement démarré - Utilisez le bouton BUZZ pour parler');
                    mutedCount++;
                } catch (error) {
                    console.error(`Erreur lors du mute de ${member.user.tag}:`, error.message);
                }
            }

            console.log(`✅ Bot rejoint le canal vocal: ${voiceChannel.name} - ${mutedCount} membre(s) muté(s)`);

            // Récupérer le mode choisi
            const mode = interaction.options.getString('mode');
            
            // Générer un ID unique pour cet événement
            const eventId = `${interaction.guildId}-${Date.now()}`;

            // Initialiser l'état du BUZZ pour ce serveur
            const eventData = {
                eventId: eventId,
                canBuzz: false, // VERROUILLÉ par défaut
                currentSpeaker: null,
                voiceChannelId: voiceChannel.id,
                channelId: interaction.channelId, // Canal où l'événement a été démarré
                mode: mode, // 'simple' ou 'multi'
                multiBuzzers: [], // Pour le mode multi (max 3)
                voteData: null, // Pour stocker les données de vote
                attackData: null, // Pour stocker les données d'attaque
                createdAt: Date.now(),
                createdBy: interaction.user.id
            };
            
            interaction.client.buzzState.set(interaction.guildId, eventData);
            
            // Sauvegarder dans le fichier JSON
            saveEvent(interaction.guildId, eventData);
            console.log(`💾 Événement ${eventId} sauvegardé dans events.json`);

            // Chercher le rôle buzzEvent
            const role = interaction.guild.roles.cache.find(r => r.name === 'buzzEvent');
            
            // Créer le bouton BUZZ avec l'eventId
            const button = new ButtonBuilder()
                .setCustomId(`buzz_${eventId}`)
                .setLabel('BUZZ')
                .setEmoji('🔔')
                .setStyle(ButtonStyle.Success);

            const row = new ActionRowBuilder()
                .addComponents(button);

            // Créer l'embed
            const modeText = mode === 'multi' 
                ? '🎪 **Mode MultiBuzz** - Les 3 premiers à buzzer parlent, puis vote!'
                : '🎯 **Mode SimpleBuzz** - Le premier à buzzer parle';
            
            const embed = new EmbedBuilder()
                .setColor('#FF0000') // Rouge car verrouillé par défaut
                .setTitle('🎉 Événement démarré!')
                .setDescription(
                    `**Canal vocal:** ${voiceChannel.name}\n` +
                    `${modeText}\n\n` +
                    `🔇 Tout le monde est muté!\n` +
                    `🔒 Le BUZZ est **VERROUILLÉ** par défaut!\n\n` +
                    `Pour parler, vous devez:\n` +
                    `✅ Être dans le canal vocal\n` +
                    `✅ Avoir le rôle ${role ? role : '**buzzEvent**'}\n` +
                    `✅ Attendre que l'admin déverrouille avec \`/unlockbuzz\`\n` +
                    `✅ Cliquer sur le bouton **BUZZ**\n\n` +
                    (mode === 'multi' 
                        ? `🎪 Les 3 premiers buzzent → Ils parlent → Vote → L'admin valide avec \`/goodbuzz\`\n\n`
                        : `🎯 Le premier buzze → Il parle → L'admin valide avec \`/goodbuzz\` ou \`/badbuzz\`\n\n`) +
                    `**Commandes admin:** \`/unlockbuzz\` \`/lockbuzz\` \`/rebuzz\``
                )
                .addFields(
                    { name: '🎮 Mode', value: mode === 'multi' ? 'MultiBuzz (3 joueurs)' : 'SimpleBuzz (1 joueur)', inline: true },
                    { name: '🎤 Canal', value: voiceChannel.name, inline: true },
                    { name: '👥 Participants', value: `${members.size}`, inline: true }
                )
                .setFooter({ text: `Event ID: ${eventId}` })
                .setTimestamp();

            // Envoyer avec notification si le rôle existe
            let notificationText = '';
            if (role) {
                notificationText = `${role} Un événement vient de commencer!`;
            }

            await interaction.reply({
                content: notificationText || undefined,
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('❌ Erreur lors du démarrage de l\'événement:', error);
            await interaction.reply({
                content: '❌ Une erreur est survenue lors du démarrage de l\'événement!',
                ephemeral: true
            });
        }
    },
};
