const { Events, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder } = require('discord.js');
const { addWin } = require('../utils/leaderboard');
const { syncBuzzState } = require('../utils/eventStorage');

module.exports = {
    name: Events.InteractionCreate,

    async execute(interaction) {
        // Gérer les commandes slash
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`❌ Commande ${interaction.commandName} introuvable`);
                return;
            }

            try {
                await command.execute(interaction);
                console.log(`✓ ${interaction.user.tag} a exécuté /${interaction.commandName}`);
            } catch (error) {
                console.error(`❌ Erreur lors de l'exécution de ${interaction.commandName}:`, error);

                const errorMessage = {
                    content: '❌ Une erreur est survenue lors de l\'exécution de cette commande!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }

        // Gérer les boutons
        if (interaction.isButton()) {
            // Bouton pour le rôle buzzEvent
            if (interaction.customId === 'get_buzzEvent_role') {
                try {
                    // Vérifier les permissions du bot
                    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
                        return interaction.reply({
                            content: '❌ Je n\'ai pas la permission de gérer les rôles!',
                            ephemeral: true
                        });
                    }

                    // Chercher le rôle
                    let role = interaction.guild.roles.cache.find(r => r.name === 'buzzEvent');

                    // Créer le rôle s'il n'existe pas
                    if (!role) {
                        role = await interaction.guild.roles.create({
                            name: 'buzzEvent',
                            color: '#FFA500',
                            reason: 'Rôle créé automatiquement pour les événements',
                            permissions: []
                        });
                        console.log(`✅ Rôle buzzEvent créé sur ${interaction.guild.name}`);
                    }

                    // Vérifier si l'utilisateur a déjà le rôle
                    if (interaction.member.roles.cache.has(role.id)) {
                        // Retirer le rôle
                        await interaction.member.roles.remove(role);
                        await interaction.reply({
                            content: `✅ Le rôle ${role} vous a été retiré!`,
                            ephemeral: true
                        });
                        console.log(`✓ Rôle buzzEvent retiré à ${interaction.user.tag}`);
                    } else {
                        // Ajouter le rôle
                        await interaction.member.roles.add(role);
                        await interaction.reply({
                            content: `✅ Vous avez maintenant le rôle ${role}! Vous serez notifié des événements.`,
                            ephemeral: true
                        });
                        console.log(`✓ Rôle buzzEvent donné à ${interaction.user.tag}`);
                    }
                } catch (error) {
                    console.error('❌ Erreur lors de la gestion du rôle:', error);
                    await interaction.reply({
                        content: '❌ Une erreur est survenue. Vérifiez que j\'ai les bonnes permissions!',
                        ephemeral: true
                    });
                }
            }

            // Bouton BUZZ pour parler pendant l'événement
            if (interaction.customId.startsWith('buzz_')) {
                try {
                    // Extraire l'eventId du customId
                    const eventIdFromButton = interaction.customId.replace('buzz_', '');
                    
                    // Récupérer l'état du BUZZ pour ce serveur
                    const buzzState = interaction.client.buzzState.get(interaction.guildId);

                    if (!buzzState) {
                        return interaction.reply({
                            content: '❌ Aucun événement n\'est en cours! Utilisez `/startevent` pour démarrer.',
                            ephemeral: true
                        });
                    }
                    
                    // Vérifier que le bouton correspond à l'événement actuel
                    if (buzzState.eventId !== eventIdFromButton) {
                        return interaction.reply({
                            content: `❌ Ce bouton BUZZ provient d'un ancien événement!\n` +
                                `Event actuel: \`${buzzState.eventId}\`\n` +
                                `Bouton: \`${eventIdFromButton}\`\n\n` +
                                `Utilisez le bouton BUZZ le plus récent.`,
                            ephemeral: true
                        });
                    }
                    
                    console.log(`[Event ${buzzState.eventId}] BUZZ de ${interaction.user.tag}`);

                    // MODE SIMPLE BUZZ
                    if (buzzState.mode === 'simple') {
                        // Vérifier si quelqu'un peut encore buzzer
                        if (!buzzState.canBuzz) {
                            const currentSpeaker = await interaction.guild.members.fetch(buzzState.currentSpeaker);
                            return interaction.reply({
                                content: `⏱️ Trop lent! ${currentSpeaker.user} a été plus rapide!`,
                                ephemeral: true
                            });
                        }
                    } else {
                        // MODE MULTI BUZZ - Vérifier si on a déjà 3 buzzers
                        if (buzzState.multiBuzzers.length >= 3) {
                            return interaction.reply({
                                content: `⏱️ Trop lent! Les 3 places sont déjà prises!`,
                                ephemeral: true
                            });
                        }

                        // Vérifier si l'utilisateur a déjà buzzé
                        if (buzzState.multiBuzzers.some(b => b.userId === interaction.user.id)) {
                            return interaction.reply({
                                content: `⚠️ Vous avez déjà buzzé!`,
                                ephemeral: true
                            });
                        }
                    }

                    // Vérifier si l'utilisateur est dans un canal vocal
                    if (!interaction.member.voice.channel) {
                        return interaction.reply({
                            content: '❌ Vous devez être dans un canal vocal pour utiliser le BUZZ!',
                            ephemeral: true
                        });
                    }

                    // Vérifier que l'utilisateur est dans le bon canal vocal
                    if (interaction.member.voice.channel.id !== buzzState.voiceChannelId) {
                        return interaction.reply({
                            content: '❌ Vous devez être dans le canal vocal de l\'événement!',
                            ephemeral: true
                        });
                    }

                    // Chercher le rôle buzzEvent
                    const role = interaction.guild.roles.cache.find(r => r.name === 'buzzEvent');

                    if (!role) {
                        return interaction.reply({
                            content: '❌ Le rôle buzzEvent n\'existe pas! Contactez un administrateur.',
                            ephemeral: true
                        });
                    }

                    // Vérifier si l'utilisateur a le rôle buzzEvent
                    if (!interaction.member.roles.cache.has(role.id)) {
                        return interaction.reply({
                            content: `❌ Vous devez avoir le rôle ${role} pour utiliser le BUZZ!`,
                            ephemeral: true
                        });
                    }

                    // Vérifier les permissions du bot
                    const voiceChannel = interaction.member.voice.channel;
                    const permissions = voiceChannel.permissionsFor(interaction.client.user);

                    if (!permissions.has(PermissionFlagsBits.MuteMembers)) {
                        return interaction.reply({
                            content: '❌ Je n\'ai pas la permission de gérer les mutes!',
                            ephemeral: true
                        });
                    }

                    // Démuter l'utilisateur
                    await interaction.member.voice.setMute(false, 'BUZZ activé!');

                    // MODE SIMPLE BUZZ
                    if (buzzState.mode === 'simple') {
                        buzzState.canBuzz = false;
                        buzzState.currentSpeaker = interaction.user.id;
                        
                        // Sauvegarder les modifications
                        interaction.client.buzzState.set(interaction.guildId, buzzState);
                        syncBuzzState(interaction.client, interaction.guildId);

                        await interaction.reply({
                            content: '🔔 **BUZZ!** Vous êtes le plus rapide! Vous pouvez maintenant parler!\n⏳ En attente de la validation de l\'admin...',
                            ephemeral: true
                        });

                        // Créer les boutons d'action normale ou attaque
                        try {
                            const normalButton = new ButtonBuilder()
                                .setCustomId(`action_normal_${buzzState.eventId}`)
                                .setLabel('Réponse Normale')
                                .setEmoji('💬')
                                .setStyle(ButtonStyle.Primary);

                            const attackButton = new ButtonBuilder()
                                .setCustomId(`action_attack_${buzzState.eventId}`)
                                .setLabel('Attaquer un joueur')
                                .setEmoji('⚔️')
                                .setStyle(ButtonStyle.Danger);

                            const actionRow = new ActionRowBuilder()
                                .addComponents(normalButton, attackButton);

                            const actionEmbed = new EmbedBuilder()
                                .setColor('#FFD700')
                                .setTitle('⚡ BUZZ gagné!')
                                .setDescription(
                                    `**${interaction.user}** a été le plus rapide!\n\n` +
                                    `**Choisissez votre action:**\n` +
                                    `💬 **Réponse Normale** - Répondez normalement (+1 pt si correct)\n` +
                                    `⚔️ **Attaquer** - Choisissez un joueur à attaquer (±1 pt pour chacun selon le résultat)`
                                )
                                .setFooter({ text: `Event: ${buzzState.eventId}` });

                            const channel = await interaction.client.channels.fetch(buzzState.channelId);
                            await channel.send({
                                embeds: [actionEmbed],
                                components: [actionRow]
                            });

                            console.log(`[Event ${buzzState.eventId}] Boutons d'action envoyés pour ${interaction.user.tag}`);
                        } catch (actionError) {
                            console.error(`❌ Erreur lors de l'envoi des boutons d'action:`, actionError);
                        }

                        console.log(`[Event ${buzzState.eventId}] ${interaction.user.tag} a gagné le BUZZ (SimpleBuzz)`);
                    }
                    // MODE MULTI BUZZ
                    else {
                        const { handleMultiBuzz } = require('../utils/multibuzzHandler');
                        await handleMultiBuzz(interaction, buzzState);
                    }


                } catch (error) {
                    console.error('❌ Erreur lors du BUZZ:', error);
                    await interaction.reply({
                        content: '❌ Une erreur est survenue lors du démute!',
                        ephemeral: true
                    });
                }
            }

            // Gérer les votes MultiBuzz
            if (interaction.customId.startsWith('vote_')) {
                const buzzState = interaction.client.buzzState.get(interaction.guildId);
                if (buzzState && buzzState.mode === 'multi') {
                    const { handleVote } = require('../utils/multibuzzHandler');
                    await handleVote(interaction, buzzState);
                }
            }

            // Bouton Action Normale
            if (interaction.customId.startsWith('action_normal_')) {
                const eventIdFromButton = interaction.customId.replace('action_normal_', '');
                const buzzState = interaction.client.buzzState.get(interaction.guildId);
                
                if (!buzzState || buzzState.eventId !== eventIdFromButton) {
                    return interaction.reply({
                        content: '❌ Ce bouton provient d\'un ancien événement!',
                        ephemeral: true
                    });
                }
                
                if (buzzState.currentSpeaker !== interaction.user.id) {
                    return interaction.reply({
                        content: '❌ Ce n\'est pas votre tour!',
                        ephemeral: true
                    });
                }

                await interaction.reply({
                    content: `💬 **${interaction.user}** a choisi de répondre normalement!\n\n🎯 Admin: Utilisez \`/goodbuzz\` pour donner 1 point ou \`/badbuzz\` si incorrect.`,
                    ephemeral: false
                });

                // Désactiver les boutons
                await interaction.message.edit({ components: [] });
            }

            // Bouton Attaque
            if (interaction.customId.startsWith('action_attack_')) {
                const eventIdFromButton = interaction.customId.replace('action_attack_', '');
                const buzzState = interaction.client.buzzState.get(interaction.guildId);
                
                if (!buzzState || buzzState.eventId !== eventIdFromButton) {
                    return interaction.reply({
                        content: '❌ Ce bouton provient d\'un ancien événement!',
                        ephemeral: true
                    });
                }
                
                if (buzzState.currentSpeaker !== interaction.user.id) {
                    return interaction.reply({
                        content: '❌ Ce n\'est pas votre tour!',
                        ephemeral: true
                    });
                }

                // Vérifier le nombre d'attaques restantes
                const { getRemainingAttacks } = require('../utils/leaderboard');
                const remaining = getRemainingAttacks(interaction.guildId, interaction.user.id);
                
                if (remaining <= 0) {
                    return interaction.reply({
                        content: '❌ Vous avez utilisé toutes vos attaques (limite: 3)! Vous ne pouvez plus attaquer pour cette session.',
                        ephemeral: true
                    });
                }

                // Récupérer tous les membres du vocal avec le rôle buzzEvent (sauf l'attaquant)
                const voiceChannel = interaction.guild.channels.cache.get(buzzState.voiceChannelId);
                const role = interaction.guild.roles.cache.find(r => r.name === 'buzzEvent');
                
                const potentialTargets = voiceChannel.members
                    .filter(m => !m.user.bot && m.id !== interaction.user.id && m.roles.cache.has(role.id))
                    .map(m => ({
                        label: m.user.username,
                        value: m.id,
                        description: `Attaquer ${m.user.username}`
                    }));

                if (potentialTargets.length === 0) {
                    return interaction.reply({
                        content: '❌ Aucune cible disponible pour l\'attaque!',
                        ephemeral: true
                    });
                }

                // Créer le menu de sélection
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId(`select_attack_target_${buzzState.eventId}`)
                    .setPlaceholder(`Choisissez votre cible (${remaining} attaques restantes)`)
                    .addOptions(potentialTargets.slice(0, 25)); // Max 25 options

                const selectRow = new ActionRowBuilder()
                    .addComponents(selectMenu);

                await interaction.reply({
                    content: '⚔️ **Choisissez votre cible:**',
                    components: [selectRow],
                    ephemeral: true
                });

                // Désactiver les boutons d'action
                await interaction.message.edit({ components: [] });
            }
        }

        // Gérer les menus de sélection
        if (interaction.isStringSelectMenu()) {
            // Sélection de la cible d'attaque
            if (interaction.customId.startsWith('select_attack_target_')) {
                const eventIdFromMenu = interaction.customId.replace('select_attack_target_', '');
                const buzzState = interaction.client.buzzState.get(interaction.guildId);
                
                if (!buzzState || buzzState.eventId !== eventIdFromMenu) {
                    return interaction.update({
                        content: '❌ Ce menu provient d\'un ancien événement!',
                        components: [],
                        embeds: []
                    });
                }
                
                if (buzzState.currentSpeaker !== interaction.user.id) {
                    return interaction.reply({
                        content: '❌ Ce n\'est pas votre tour!',
                        ephemeral: true
                    });
                }

                // Consommer une attaque
                const { useAttack } = require('../utils/leaderboard');
                const attackResult = useAttack(interaction.guildId, interaction.user.id, interaction.user.tag);
                
                if (!attackResult.success) {
                    return interaction.update({
                        content: '❌ Vous avez utilisé toutes vos attaques (limite: 3)!',
                        components: [],
                        embeds: []
                    });
                }

                const targetId = interaction.values[0];
                const targetMember = await interaction.guild.members.fetch(targetId);

                // Démuter la cible
                await targetMember.voice.setMute(false, 'Cible de l\'attaque');

                // Stocker les données d'attaque
                buzzState.attackData = {
                    attacker: {
                        userId: interaction.user.id,
                        username: interaction.user.tag
                    },
                    target: {
                        userId: targetId,
                        username: targetMember.user.tag
                    }
                };
                
                // Sauvegarder les modifications
                interaction.client.buzzState.set(interaction.guildId, buzzState);
                syncBuzzState(interaction.client, interaction.guildId);

                const attackEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('⚔️ ATTAQUE!')
                    .setDescription(
                        `**${interaction.user}** attaque **${targetMember.user}**!\n\n` +
                        `🎤 Les deux joueurs sont démutés!\n` +
                        `⚔️ **Attaques restantes:** ${attackResult.remaining}/${attackResult.limit}\n\n` +
                        `**Admin, utilisez:**\n` +
                        `✅ \`/attackwin\` - L'attaquant a bien répondu (+1 attaquant, -1 cible)\n` +
                        `❌ \`/attackfail\` - L'attaquant s'est trompé (-1 attaquant, +1 cible)`
                    )
                    .setTimestamp();

                await interaction.update({
                    content: `⚔️ Vous attaquez **${targetMember.user}**! Vous êtes tous les deux démutés! (${attackResult.remaining} attaques restantes)`,
                    components: [],
                    embeds: []
                });

                await interaction.channel.send({ embeds: [attackEmbed] });

                console.log(`⚔️ ${interaction.user.tag} attaque ${targetMember.user.tag} (${attackResult.remaining} attaques restantes)`);
            }
        }
    },
};
