# BuzzBot

Bot Discord de quiz compétitif avec système de BUZZ, classement et mécaniques de jeu.

## Description

BuzzBot est un bot Discord conçu pour animer des sessions de quiz interactives. Les participants rejoignent un canal vocal, se font muter automatiquement, et doivent cliquer sur un bouton BUZZ pour pouvoir répondre. Le bot gère deux modes de jeu, un système de points, des attaques entre joueurs, et un classement persistant.

## Fonctionnalités

### Système de BUZZ
- Le bot rejoint un canal vocal et mute tous les participants
- Un bouton BUZZ apparaît dans le chat
- Le premier à cliquer est démuté et peut répondre
- Validation par l'administrateur (bonne/mauvaise réponse)

### Modes de jeu
- **SimpleBuzz** : Premier arrivé, premier servi (1 joueur)
- **MultiBuzz** : Les 3 premiers buzzent, puis vote communautaire

### Système d'attaque
- Les joueurs peuvent attaquer d'autres joueurs
- Attaque réussie : +1 pt attaquant, -1 pt cible
- Attaque ratée : -1 pt attaquant, +1 pt cible
- Limite de 3 attaques par joueur

### Classement
- Points persistants sauvegardés en JSON
- Statistiques personnelles
- Top 10 des joueurs
- Système de réinitialisation avec confirmation

## Installation

### Prérequis
- Node.js v16.9.0+
- Compte Discord Developer

### Configuration

1. Installer les dépendances :
```bash
npm install
```

2. Créer un fichier `.env` :
```env
DISCORD_TOKEN=votre_token
CLIENT_ID=votre_client_id
GUILD_ID=votre_guild_id
```

3. Activer les intents sur le [Discord Developer Portal](https://discord.com/developers/applications) :
   - SERVER MEMBERS INTENT
   - PRESENCE INTENT
   - GUILD VOICE STATES

4. Déployer les commandes :
```bash
node deploy-commands.js
```

5. Démarrer le bot :
```bash
node index.js
```

## Commandes

### Gestion d'événements
- `/startevent` - Démarrer un événement (SimpleBuzz ou MultiBuzz)
- `/stopevent` - Arrêter l'événement en cours
- `/rebuzz` - Remuter tout le monde et réactiver le BUZZ
- `/changemode` - Changer de mode en cours d'événement
- `/eventinfo` - Voir les détails de l'événement en cours

### Gestion vocale
- `/unmutebuzz` - Démuter tout le monde (discussion libre)
- `/unmutefocus` - Démuter jusqu'à 5 personnes spécifiques

### Validation
- `/goodbuzz` - Valider une bonne réponse (+1 ou +2 pts)
- `/badbuzz` - Refuser une réponse (remute et relance)
- `/attackwin` - Valider une attaque réussie
- `/attackfail` - Valider une attaque ratée

### Classement
- `/leaderboard` - Afficher le top 10
- `/mystats` - Voir ses propres statistiques
- `/addpoints` - Ajouter des points (admin)
- `/removepoints` - Retirer des points (admin)
- `/resetleaderboard` - Réinitialiser le classement (admin)

### Utilitaires
- `/role-event` - Obtenir/retirer le rôle buzzEvent
- `/ping` - Tester la latence
- `/info` - Informations sur le bot

## Structure

```
BuzzBot/
├── commands/           # 19 commandes slash
├── events/            # Gestionnaires d'événements
├── utils/             # Utilitaires (leaderboard, persistence, etc.)
├── data/              # Fichiers JSON (leaderboard, events)
├── index.js           # Point d'entrée
└── deploy-commands.js # Script de déploiement
```

## Technologies

- Discord.js v14.14.1
- @discordjs/voice v0.16.1
- Node.js
- JSON pour la persistance

## Sécurité

- Seul le créateur de l'événement ou un administrateur peut utiliser les commandes de contrôle
- Validation des événements par ID unique
- Limite d'attaques par utilisateur
- Expiration automatique des événements après 24h

## Licence

ISC
